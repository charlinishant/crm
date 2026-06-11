const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const srcRoot = path.join(root, "src");
const backupRoot = path.join(srcRoot, "_unused_backup");

const thirdPartyCssImports = [
  "react-quill-new/dist/quill.snow.css",
  "jsvectormap/dist/css/jsvectormap.css",
  "react-toastify/dist/ReactToastify.css",
  "react-modal-video/css/modal-video.min.css",
  "flatpickr/dist/flatpickr.min.css",
  "highlight.js/styles/github.css",
];

function walk(dir, predicate, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (fullPath !== backupRoot) {
        walk(fullPath, predicate, output);
      }
    } else if (!predicate || predicate(fullPath)) {
      output.push(fullPath);
    }
  }

  return output;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function localCssImports(filePath, source) {
  const imports = [];
  const importPattern = /import\s+["']([^"']+\.css)["'];?/g;

  for (const match of source.matchAll(importPattern)) {
    const importPath = match[1];
    if (!importPath.startsWith(".")) continue;
    if (filePath.includes(`${path.sep}src${path.sep}user${path.sep}`)) continue;

    const absoluteCssPath = path.resolve(path.dirname(filePath), importPath);
    imports.push({ statement: match[0], absoluteCssPath });
  }

  return imports;
}

function buildStylesheet() {
  const sections = [
    "/* Vendor CSS imported once by App.js. */",
    ...thirdPartyCssImports.map((importPath) => `@import "${importPath}";`),
    "",
    "/* Base theme styles migrated from public/assets/css/style.css. */",
    fs
      .readFileSync(path.join(root, "public", "assets", "css", "style.css"), "utf8")
      .replaceAll("url(../images/", "url(/assets/images/")
      .replaceAll('url("../images/', 'url("/assets/images/'),
    "",
    "/* Project overrides migrated from public/assets/css/extra.css. */",
    fs.readFileSync(path.join(root, "public", "assets", "css", "extra.css"), "utf8"),
  ];

  const jsFiles = walk(srcRoot, (filePath) => /\.(js|jsx)$/.test(filePath));
  const importedCssFiles = new Map();

  for (const jsFile of jsFiles) {
    const source = fs.readFileSync(jsFile, "utf8");
    for (const cssImport of localCssImports(jsFile, source)) {
      if (fs.existsSync(cssImport.absoluteCssPath)) {
        importedCssFiles.set(cssImport.absoluteCssPath, cssImport.absoluteCssPath);
      }
    }
  }

  for (const cssFile of [...importedCssFiles.values()].sort()) {
    sections.push("");
    sections.push(`/* Migrated from ${toPosix(path.relative(root, cssFile))}. */`);
    sections.push(fs.readFileSync(cssFile, "utf8"));
  }

  fs.writeFileSync(path.join(srcRoot, "styles.css"), sections.join("\n"), "utf8");
  return [...importedCssFiles.values()].sort();
}

function removeAdminCssImports() {
  const jsFiles = walk(srcRoot, (filePath) => /\.(js|jsx)$/.test(filePath));
  const changedFiles = [];

  for (const jsFile of jsFiles) {
    if (jsFile.includes(`${path.sep}src${path.sep}user${path.sep}`)) continue;

    const source = fs.readFileSync(jsFile, "utf8");
    const updated = source
      .replace(/import\s+["'][.][^"']+\.css["'];?\r?\n/g, "")
      .replace(/import\s+["']flatpickr\/dist\/flatpickr\.min\.css["'];?\r?\n/g, "")
      .replace(/import\s+["']highlight\.js\/styles\/github\.css["'];?\r?\n/g, "");

    if (updated !== source) {
      fs.writeFileSync(jsFile, updated, "utf8");
      changedFiles.push(jsFile);
    }
  }

  return changedFiles;
}

function updateAppImport() {
  const appFile = path.join(srcRoot, "App.js");
  const source = fs.readFileSync(appFile, "utf8");
  if (source.includes('import "./styles.css";')) return false;

  fs.writeFileSync(appFile, `import "./styles.css";\n${source}`, "utf8");
  return true;
}

function updateIndexJs() {
  const indexFile = path.join(srcRoot, "index.js");
  const source = fs.readFileSync(indexFile, "utf8");
  const updated = source.replace(/import\s+["'][^"']+\.css["'];?\r?\n/g, "");

  if (updated !== source) {
    fs.writeFileSync(indexFile, updated, "utf8");
    return true;
  }

  return false;
}

function updateIndexHtml() {
  const htmlFile = path.join(root, "public", "index.html");
  const source = fs.readFileSync(htmlFile, "utf8");
  const updated = source
    .replace(/\s*<!-- main css -->\r?\n\s*<link rel="stylesheet" href="assets\/css\/style\.css">\r?\n\s*<link rel="stylesheet" href="assets\/css\/extra\.css">/, "")
    .replace(/\s*<link rel="stylesheet" href="assets\/css\/style\.css">\r?\n\s*<link rel="stylesheet" href="assets\/css\/extra\.css">/, "");

  if (updated !== source) {
    fs.writeFileSync(htmlFile, updated, "utf8");
    return true;
  }

  return false;
}

function moveToBackup(filePath) {
  const relativePath = path.relative(srcRoot, filePath);
  const targetPath = path.join(backupRoot, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.renameSync(filePath, targetPath);
  return targetPath;
}

function cssFilesToBackup(importedCssFiles) {
  return importedCssFiles.filter((filePath) => !filePath.includes(`${path.sep}src${path.sep}user${path.sep}`));
}

function reachableAdminFiles() {
  const sourceFiles = walk(srcRoot, (filePath) => /\.(js|jsx)$/.test(filePath)).filter(
    (filePath) => !filePath.includes(`${path.sep}src${path.sep}user${path.sep}`)
  );
  const byName = new Map(sourceFiles.map((filePath) => [filePath.toLowerCase(), filePath]));
  const extensions = ["", ".js", ".jsx", `${path.sep}index.js`, `${path.sep}index.jsx`];
  const seen = new Set();

  function resolveImport(fromFile, importPath) {
    if (!importPath.startsWith(".")) return null;
    const base = path.resolve(path.dirname(fromFile), importPath);
    for (const extension of extensions) {
      const match = byName.get(`${base}${extension}`.toLowerCase());
      if (match) return match;
    }
    return null;
  }

  function visit(filePath) {
    if (!filePath || seen.has(filePath)) return;
    seen.add(filePath);

    const source = fs.readFileSync(filePath, "utf8");
    const importPattern = /import\s+(?:[\s\S]*?\s+from\s*)?["']([^"']+)["']/g;
    const requirePattern = /require\(["']([^"']+)["']\)/g;

    for (const match of source.matchAll(importPattern)) {
      visit(resolveImport(filePath, match[1]));
    }

    for (const match of source.matchAll(requirePattern)) {
      visit(resolveImport(filePath, match[1]));
    }
  }

  visit(path.join(srcRoot, "index.js"));
  visit(path.join(srcRoot, "App.js"));

  return sourceFiles.filter(
    (filePath) =>
      !seen.has(filePath) &&
      !["App.test.js", "setupTests.js", "reportWebVitals.js"].includes(path.basename(filePath))
  );
}

function main() {
  const command = process.argv[2];

  if (command === "scan-unused") {
    console.log(reachableAdminFiles().map((filePath) => toPosix(path.relative(root, filePath))).join("\n"));
    return;
  }

  if (command !== "apply") {
    console.log("Usage: node scripts/frontend-css-cleanup.js apply|scan-unused");
    process.exitCode = 1;
    return;
  }

  const importedCssFiles = buildStylesheet();
  const changedImportFiles = removeAdminCssImports();
  const backedUpCssFiles = cssFilesToBackup(importedCssFiles).map(moveToBackup);
  const backedUpUnusedSourceFiles = reachableAdminFiles().map(moveToBackup);
  const appUpdated = updateAppImport();
  const indexUpdated = updateIndexJs();
  const htmlUpdated = updateIndexHtml();

  console.log(
    JSON.stringify(
      {
        stylesCreated: "src/styles.css",
        changedImportFiles: changedImportFiles.map((filePath) => toPosix(path.relative(root, filePath))),
        backedUpCssFiles: backedUpCssFiles.map((filePath) => toPosix(path.relative(root, filePath))),
        backedUpUnusedSourceFiles: backedUpUnusedSourceFiles.map((filePath) => toPosix(path.relative(root, filePath))),
        appUpdated,
        indexUpdated,
        htmlUpdated,
      },
      null,
      2
    )
  );
}

main();
