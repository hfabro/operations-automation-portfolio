import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

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
  "work/telemetry-energy/index.html", "work/digital-kanban/index.html",
  "work/facilities-digital-operations/index.html", "work/facilities-decision-support/index.html", "work/toolbox-talks/index.html"
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

const contactConfig=readFileSync(join(root,'scripts/site-config.js'),'utf8');
const contactUrl=contactConfig.match(/linkedInUrl:\s*"(https:\/\/www\.linkedin\.com\/in\/[A-Za-z0-9-]+\/?)"/)?.[1];
if(!contactUrl)report(join(root,'scripts/site-config.js'),'missing or invalid LinkedIn contact URL');
else for(const path of ['index.html','about/index.html','SECURITY.md','.well-known/security.txt'])
 if(!readFileSync(join(root,path),'utf8').includes(contactUrl))report(join(root,path),'LinkedIn contact does not match configured URL');
const devicePreviewFile = join(root, "scripts/device-preview.js");
const telemetryDemoFile = join(root, "demos/telemetry-explorer/demo.js");
if (!readFileSync(devicePreviewFile, "utf8").includes("devicepreviewchange")) report(devicePreviewFile, "missing settled device-preview event");
const telemetryDemoText = readFileSync(telemetryDemoFile, "utf8");
if (!telemetryDemoText.includes("devicepreviewchange")) report(telemetryDemoFile, "missing chart redraw listener for device changes");
if (!telemetryDemoText.includes("ResizeObserver")) report(telemetryDemoFile, "missing dimension-based chart redraw guard");

const sourceFiles = [".html", ".css", ".js", ".mjs", ".svg", ".json", ".md", ".txt", ".xml", ".yml"].flatMap((extension) => walk(root, extension));
for (const file of demoFiles) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('microsoft-surfaces.css')) report(file, 'missing platform finishing stylesheet');
  if (/View all demos|Previous demo|Next demo|>Demos</.test(html)) report(file, 'outdated public systems terminology');
}
const deviceStyle = readFileSync(join(root,'assets/device-preview.css'),'utf8');
if (!deviceStyle.includes('overflow-y:auto') || !deviceStyle.includes('height:min(780px,85svh)')) report(root,'bounded device scrollport rule missing');
const workflowSource=readFileSync(join(root,'scripts/workflow-recreations.js'),'utf8');
if(!workflowSource.includes('data-spatial-overlay')||workflowSource.includes('class="ops-grid"')) report(root,'spatial workflow contract missing or redundant location matrix present');
const ladderSource=readFileSync(join(root,'demos/ladder-inspection/index.html'),'utf8');
for(const hook of ['data-month','data-department','data-expected-assets','data-qr-scan','data-certify']) if(!ladderSource.includes(hook)) report(root,'missing ladder cycle/identity/gallery/certification hook');

// Privacy hotfix: keep fictional examples qualified and preserve the approved PDF.
for (const [page, phrase] of [
  ['work/facilities-decision-support/index.html', 'not a measured or achieved employer result'],
  ['work/telemetry-energy/index.html', 'not a measured result'],
  ['about/index.html', 'numerical values on this portfolio are fictional teaching examples']
]) {
  if (!readFileSync(join(root,page),'utf8').includes(phrase)) report(join(root,page),'missing fictional-example boundary');
}
const approvedResumeHash = 'c478358f914b53292a240a3a2438173380872d328ec55c64de923d0a4a995acc';
if (createHash('sha256').update(readFileSync(join(root,'resume/david-h-fabro-resume.pdf'))).digest('hex') !== approvedResumeHash)
  report(join(root,'resume/david-h-fabro-resume.pdf'),'resume does not match the owner-approved PDF');
const leakagePatterns = [
  [/\bsk-(?:proj|svcac)-[A-Za-z0-9_-]{15,}/, "API credential"],
  [/\bgithub_pat_[A-Za-z0-9_]{15,}/, "GitHub credential"],
  [/\b(?:OPENAI_API_KEY|CODEX_API_KEY)\s*[:=]\s*["']?[^\s"']{8,}/, "credential assignment"],
  [/\bBearer\s+[A-Za-z0-9_.-]{20,}/, "bearer credential"],
  [/https?:\/\/(?:apps\.powerapps\.com|forms\.cloud\.microsoft)/i, "production application URL"],
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

const localPrivateIndicatorsFile=join(root,'references-private/identifier-denylist.txt');
const localPrivateIndicators=existsSync(localPrivateIndicatorsFile)
 ? readFileSync(localPrivateIndicatorsFile,'utf8').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'))
 : [];
if(localPrivateIndicators.some(s=>s.length<5)) report(root,'Private identifier entries must contain at least five characters');
// Private identifiers are checked locally, never embedded in this public repository.

for (const file of sourceFiles) {
  if (resolve(file) === resolve(validatorFile)) continue;
  const text = readFileSync(file, "utf8");
  const publicPath=relative(root,file).replaceAll('\\','/');
  if (/\.(html|css|js|svg|json)$/i.test(publicPath)) {
    // Public code contains no employer or personnel denylist: use local-only data below.
    if (/(?:\b(?:confidential|internal only|not for distribution)\b\s*[:\-]|\b(?:TENANT_SECRET|PRIVATE_PRODUCTION_ID)\b)/i.test(text)) report(file,'possible internal-only marker in runtime content');
    if (/system[n]stration/i.test(text)) report(file,'malformed editorial replacement');
    if (file.endsWith('.html') && /(?:Demo library|demonstration library|complete interactive proof lab)/i.test(text)) report(file,'obsolete Systems library wording');
  }
  if((publicPath.startsWith('demos/')||publicPath.startsWith('assets/')||publicPath.startsWith('scripts/')) && /references-private[\\/]/i.test(text)) report(file,'private reference path in recreation');
  for(const privateIdentifier of localPrivateIndicators){
    if(text.toLowerCase().includes(privateIdentifier.toLowerCase())) report(file,'private identifier present in public source');
  }
  for (const [pattern, label] of leakagePatterns) {
    if (pattern.test(text)) report(file, `possible ${label}`);
  }
}

for (const file of [...walk(root, ".js"), ...walk(root, ".mjs")]) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) report(file, (result.stderr || result.stdout || "JavaScript syntax check failed").trim());
}

// Navigation relationships are content contracts; URL resolution is checked above.
for (const [page, links] of [
  ['demos/index.html',['service-intake/']],
  ['resume/index.html',['../','../work/','../demos/','../about/']],
  ['demos/compliance-workflow/index.html',['../ehs-control/','../../work/compliance-automation/']],
  ['demos/telemetry-explorer/index.html',['../forklift-fleet/','../../work/telemetry-energy/']],
  ['demos/building-operations/index.html',['../facility-leaks/']],
  ['demos/connected-operations/index.html',['../../smart-factory/']]
]) {
  const source=readFileSync(join(root,page),'utf8');
  for (const href of links) if (!source.includes(`href="${href}"`)) report(join(root,page),'missing contextual navigation route');
}
const series=readFileSync(join(root,'scripts/demo-series.js'),'utf8');
if ((series.match(/category: "/g)||[]).length!==14) report(root,'system series maturity coverage changed');

if (errors.length) {
  console.error(`Site validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Site validation passed: ${htmlFiles.length} HTML pages, ${demoFiles.length} demo pages, local links, fragments, policies, metadata, leakage indicators, and JavaScript syntax.`);
