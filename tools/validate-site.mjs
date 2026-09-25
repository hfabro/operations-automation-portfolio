import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const validatorFile = fileURLToPath(import.meta.url);
const ignoredDirectories = new Set([".git", "tmp"]);
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
  const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  for (const id of new Set(duplicates)) report(file, `duplicate id "${id}"`);
  idCache.set(file, new Set(ids));

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

const demoFiles = htmlFiles.filter((file) => relative(root, file).replaceAll("\\", "/").startsWith("demos/"));
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

for (const requiredFile of ["COPYRIGHT.md", "SECURITY.md", ".well-known/security.txt", ".github/workflows/validate.yml", "robots.txt", "sitemap.xml", "assets/og.png"]) {
  const target = join(root, requiredFile);
  if (!existsSync(target)) report(target, "required launch artifact is missing");
}

const sourceFiles = [".html", ".css", ".js", ".md", ".txt", ".xml", ".yml"].flatMap((extension) => walk(root, extension));
const leakagePatterns = [
  [/\bcodex-remote-attachments\b/i, "local attachment path"],
  [/[A-Z]:\\Users\\/i, "absolute Windows user path"],
  [/https?:\/\/[^\s\"'<>]*\.sharepoint\.com/i, "SharePoint tenant URL"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i, "private key material"],
  [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/, "GitHub access token"]
];

for (const file of sourceFiles) {
  if (resolve(file) === resolve(validatorFile)) continue;
  const text = readFileSync(file, "utf8");
  for (const [pattern, label] of leakagePatterns) {
    if (pattern.test(text)) report(file, `possible ${label}`);
  }
}

for (const file of walk(root, ".js")) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) report(file, (result.stderr || result.stdout || "JavaScript syntax check failed").trim());
}

if (errors.length) {
  console.error(`Site validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Site validation passed: ${htmlFiles.length} HTML pages, ${demoFiles.length} demo pages, local links, fragments, policies, metadata, leakage indicators, and JavaScript syntax.`);
