import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const validatorFile = fileURLToPath(import.meta.url);
const ignoredDirectories = new Set([".git", "tmp", "references-private"]);
const errors = [];

function walk(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) return [];
      return walk(join(directory, entry.name), extension);
    }
    const fullPath = join(directory, entry.name);
    return extname(entry.name).toLowerCase() === extension ? [fullPath] : [];
  });
}

function report(file, message) {
  errors.push(`${relative(root, file)}: ${message}`);
}

function htmlIds(file) {
  const html = readFileSync(file, "utf8");
  return new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), (match) => match[1]));
}

function resolveLocalTarget(sourceFile, reference) {
  const withoutQuery = reference.split("?")[0];
  const [pathname] = withoutQuery.split("#");
  if (!pathname) return sourceFile;
  const decoded = decodeURIComponent(pathname);
  const target = decoded.startsWith("/") ? resolve(root, `.${decoded}`) : resolve(dirname(sourceFile), decoded);
  if (existsSync(target) && statSync(target).isDirectory()) return join(target, "index.html");
  return target;
}

const htmlFiles = walk(root, ".html");
const idCache = new Map();

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  if ((html.match(/<h1\b/gi) || []).length !== 1) report(file, "expected exactly one main heading");
  const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  for (const id of new Set(duplicates)) report(file, `duplicate id "${id}"`);
  idCache.set(file, new Set(ids));
  for (const needle of ['rel="canonical"', 'property="og:url"', 'property="og:image"']) {
    if (!html.includes(needle) && !/name="robots"[^>]*noindex/i.test(html)) report(file, `missing ${needle}`);
  }
  const primary = html.match(/<nav class="primary-nav"[\s\S]*?<\/nav>/)?.[0];
  if(primary){
    const labels=Array.from(primary.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g),m=>m[1]);
    if(labels.join('|')!== 'Work|Systems|Smart Factory|About|Resume|Contact') report(file,'primary navigation differs from current structure');
    const current=Array.from(primary.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g));
    for(const match of current){const href=match[0].match(/href="([^"]+)"/)?.[1];if(!href||resolveLocalTarget(file,href)!==file)report(file,'aria-current does not identify this page');}
  }
  if(/references-private(?:\/|\\)/i.test(html)) report(file,'private reference path exposed in HTML');

  const semanticRequirements = [
    [/<html\s+lang="[^"]+"/i, "document language"],
    [/<meta\s+name="viewport"/i, "viewport metadata"],
    [/<title>[^<]+<\/title>/i, "page title"],
    [/<meta\s+name="description"/i, "description metadata"],
    [/<main\b/i, "main landmark"],
    [/<h1\b/i, "level-one heading"],
    [/class="skip-link"/i, "skip link"]
  ];
  for (const [pattern, label] of semanticRequirements) {
    if (!pattern.test(html)) report(file, `missing ${label}`);
  }

  for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)) {
    if (!/rel="[^"]*noreferrer[^"]*"/i.test(match[0])) report(file, "target=_blank link is missing rel=noreferrer");
  }

  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference)) continue;
    const target = resolveLocalTarget(file, reference);
    if (!existsSync(target)) {
      report(file, `missing local target "${reference}"`);
      continue;
    }
    const fragment = reference.includes("#") ? reference.split("#").at(-1) : "";
    if (fragment && extname(target).toLowerCase() === ".html") {
      if (!idCache.has(target)) idCache.set(target, htmlIds(target));
      if (!idCache.get(target).has(decodeURIComponent(fragment))) report(file, `missing fragment target "${reference}"`);
    }
  }
}

const demoFiles = htmlFiles.filter((file) => {
  const path = relative(root, file).replaceAll("\\", "/");
  return path.startsWith("demos/") && path !== "demos/index.html";
});
const demoRequirements = [
  ["Content-Security-Policy", "content security policy"],
  ['name="referrer"', "referrer policy"],
  ['rel="canonical"', "canonical URL"],
  ['property="og:url"', "Open Graph URL"],
  ['property="og:image"', "Open Graph image"],
  ["demo-series.css", "shared demo navigation styles"],
  ["demo-series.js", "shared demo navigation script"]
];

for (const file of demoFiles) {
  const html = readFileSync(file, "utf8");
  for (const [needle, label] of demoRequirements) {
    if (!html.includes(needle)) report(file, `missing ${label}`);
  }
}

for (const requiredFile of [
  "COPYRIGHT.md", "SECURITY.md", ".well-known/security.txt", ".github/workflows/validate.yml",
  "robots.txt", "sitemap.xml", "assets/og.png", "assets/hubs.css",
  "work/index.html", "demos/index.html", "approach/index.html", "smart-factory/index.html", "about/index.html",
  "work/ladder-inspection/index.html", "work/compliance-automation/index.html",
  "work/telemetry-energy/index.html", "work/digital-kanban/index.html"
]) {
  const target = join(root, requiredFile);
  if (!existsSync(target)) report(target, "required launch artifact is missing");
}

const expectedDemoOrder = [
  "plant-operations-hub", "facility-leaks", "ladder-inspection", "digital-kanban",
  "toolbox-talks", "ehs-control", "electrical-analytics", "forklift-fleet",
  "cmms-lifecycle", "connected-operations", "smart-factory-roadmap",
  "compliance-workflow", "telemetry-explorer", "building-operations"
];
const demoSeriesFile = join(root, "scripts/demo-series.js");
const demoSeriesText = readFileSync(demoSeriesFile, "utf8");
const actualDemoOrder = Array.from(demoSeriesText.matchAll(/slug:\s*"([^"]+)"/g), (match) => match[1]);
if (actualDemoOrder.join("|") !== expectedDemoOrder.join("|")) {
  report(demoSeriesFile, `demo sequence does not match the public library order (${actualDemoOrder.join(", ")})`);
}

const guideFile = join(root, "scripts/demo-guide.js");
const guideText = readFileSync(guideFile, "utf8");
for (const signal of [
  "inspection-submitted", "compliance-submitted", "kanban-request-created",
  "kanban-refill-completed", "pm-submitted", "pm-disposition-recorded", "building-work-requested"
]) {
  if (!guideText.includes(`signal: "${signal}"`)) report(guideFile, `missing confirmed-state guide signal "${signal}"`);
}

const buildingDemoFile = join(root, "demos/building-operations/demo.js");
const buildingDemoText = readFileSync(buildingDemoFile, "utf8");
if (!buildingDemoText.includes("allowedActions")) report(buildingDemoFile, "missing controlled lifecycle transition rules");
if (!readFileSync(join(root, "demos/building-operations/index.html"), "utf8").includes("data-resolution-note")) {
  report(join(root, "demos/building-operations/index.html"), "missing verified-resolution note control");
}

const devicePreviewFile = join(root, "scripts/device-preview.js");
const telemetryDemoFile = join(root, "demos/telemetry-explorer/demo.js");
if (!readFileSync(devicePreviewFile, "utf8").includes("devicepreviewchange")) report(devicePreviewFile, "missing settled device-preview event");
const telemetryDemoText = readFileSync(telemetryDemoFile, "utf8");
if (!telemetryDemoText.includes("devicepreviewchange")) report(telemetryDemoFile, "missing chart redraw listener for device changes");
if (!telemetryDemoText.includes("ResizeObserver")) report(telemetryDemoFile, "missing dimension-based chart redraw guard");

const sourceFiles = [".html", ".css", ".js", ".mjs", ".svg", ".json", ".md", ".txt", ".xml", ".yml"].flatMap((extension) => walk(root, extension));
const leakagePatterns = [
  [/\bsk-(?:proj|svcac)-[A-Za-z0-9_-]{15,}/, "API credential"],
  [/\bgithub_pat_[A-Za-z0-9_]{15,}/, "GitHub credential"],
  [/\b(?:OPENAI_API_KEY|CODEX_API_KEY)\s*[:=]\s*["']?[^\s"']{8,}/, "credential assignment"],
  [/\bBearer\s+[A-Za-z0-9_.-]{20,}/, "bearer credential"],
  [/https?:\/\/(?:apps\.powerapps\.com|forms\.cloud\.microsoft)/i, "production application URL"],
  [/\bmaclean365\b/i, "tenant identifier"],
  [/\bcodex-remote-attachments\b/i, "local attachment path"],
  [/[A-Z]:\\Users\\/i, "absolute Windows user path"],
  [/https?:\/\/[^\s\"'<>]*\.sharepoint\.com/i, "SharePoint tenant URL"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i, "private key material"],
  [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/, "GitHub access token"]
];

const privateTracked = spawnSync("git", ["ls-files", "references-private"], {cwd:root,encoding:"utf8"});
if(privateTracked.status !== 0) report(root,"cannot verify private reference tracking status");
else if(privateTracked.stdout.trim()) report(root,"private reference files are tracked; release prohibited");
if(!readFileSync(join(root,".gitignore"),"utf8").includes("references-private/")) report(root,"private reference ignore rule missing");
const resumeHtml=readFileSync(join(root,"resume/index.html"),"utf8");
if(!/name="robots"[^>]*noindex/.test(resumeHtml)) report(root,"resume must remain noindex");
if(/<loc>[^<]*\/resume\//.test(readFileSync(join(root,"sitemap.xml"),"utf8"))) report(root,"resume must remain out of sitemap");
for(const slug of ["plant-operations-hub","facility-leaks","toolbox-talks","electrical-analytics","forklift-fleet","service-intake","ehs-control"]){
 const file=join(root,"demos",slug,"index.html");
 if(!readFileSync(file,"utf8").includes("Employer branding, records, URLs, identifiers, drawings, and production data have been replaced")) report(file,"missing recreation disclosure");
}

for (const file of sourceFiles) {
  if (resolve(file) === resolve(validatorFile)) continue;
  const text = readFileSync(file, "utf8");
  const publicPath=relative(root,file).replaceAll('\\','/');
  if((publicPath.startsWith('demos/')||publicPath.startsWith('assets/')||publicPath.startsWith('scripts/')) && /(?:maclean[ -]?fogg|mundelein|maclean365|references-private[\\/])/i.test(text)) report(file,'private source identifier in recreation');
  for (const [pattern, label] of leakagePatterns) {
    if (pattern.test(text)) report(file, `possible ${label}`);
  }
}

for (const file of [...walk(root, ".js"), ...walk(root, ".mjs")]) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) report(file, (result.stderr || result.stdout || "JavaScript syntax check failed").trim());
}

if (errors.length) {
  console.error(`Site validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Site validation passed: ${htmlFiles.length} HTML pages, ${demoFiles.length} demo pages, local links, fragments, policies, metadata, leakage indicators, and JavaScript syntax.`);
