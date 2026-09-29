#!/usr/bin/env node
/**
 * Arcanum Archive source extraction engine.
 *
 * Reads public/arcanum/source-manifest.json and an extracted source root.
 * Original library files are never modified.
 *
 * Native parsers:
 *   PDF  -> Mozilla PDF.js (pdfjs-dist)
 *   DOCX -> Mammoth
 *   TXT/MD/CSV/JSON/HTML -> Node
 *   Images -> copied into derived asset storage
 *
 * Optional external tools:
 *   DOC / RTF -> LibreOffice/soffice
 *   ZIP/RAR/7Z -> 7-Zip
 *   PDF fallback -> pdftotext
 *
 * Exact duplicate sources are skipped by default and linked to a canonical
 * source record. Pass --include-duplicates to process every copy.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

const rootArg = argValue("--root");
const manifestPath = argValue("--manifest", "public/arcanum/source-manifest.json");
const outputRoot = argValue("--output", "public/arcanum/extracted");
const limitArg = Number(argValue("--limit", "0") || 0);
const extractArchives = process.argv.includes("--extract-archives");
const includeDuplicates = process.argv.includes("--include-duplicates");

if (!rootArg) {
  console.error('Usage: node tools/extract-arcanum-sources.mjs --root "<library-root>" [--limit N] [--extract-archives] [--include-duplicates]');
  process.exit(1);
}

const sourceRoot = path.resolve(rootArg);
if (!fs.existsSync(sourceRoot)) throw new Error(`Source root does not exist: ${sourceRoot}`);
if (!fs.existsSync(manifestPath)) throw new Error(`Manifest not found: ${manifestPath}`);

const manifestText = fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, "");
const manifest = JSON.parse(manifestText);
const manifestFiles = Array.isArray(manifest.files) ? manifest.files : [];
const files = limitArg > 0 ? manifestFiles.slice(0, limitArg) : manifestFiles;

for (const dir of ["text", "assets", "archives", "work", "pages"]) {
  fs.mkdirSync(path.join(outputRoot, dir), { recursive: true });
}

function commandExists(command, args = ["--version"]) {
  if (!command) return false;
  try {
    const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true, timeout: 5000 });
    return !result.error && (result.status === 0 || result.status === 1);
  } catch {
    return false;
  }
}

function firstAvailable(commands) {
  for (const candidate of commands) {
    if (candidate?.command && commandExists(candidate.command, candidate.args)) return candidate.command;
  }
  return null;
}

const sevenZip = firstAvailable([
  { command: process.env.ARCANUM_7Z, args: ["i"] },
  { command: "7z", args: ["i"] },
  { command: "7z.exe", args: ["i"] },
  { command: "C:\\Program Files\\7-Zip\\7z.exe", args: ["i"] },
]);

const pdfToText = firstAvailable([
  { command: process.env.ARCANUM_PDFTOTEXT, args: ["-v"] },
  { command: "pdftotext", args: ["-v"] },
  { command: "pdftotext.exe", args: ["-v"] },
]);

const office = firstAvailable([
  { command: process.env.ARCANUM_SOFFICE, args: ["--version"] },
  { command: "soffice", args: ["--version"] },
  { command: "libreoffice", args: ["--version"] },
  { command: "C:\\Program Files\\LibreOffice\\program\\soffice.exe", args: ["--version"] },
]);

let pdfjs = null;
let mammoth = null;
let nativePdfError = null;
let nativeDocxError = null;

try {
  pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
} catch (error) {
  nativePdfError = error?.message || String(error);
}

try {
  const module = await import("mammoth");
  mammoth = module.default ?? module;
} catch (error) {
  nativeDocxError = error?.message || String(error);
}

const capabilities = {
  nativePdf: Boolean(pdfjs?.getDocument),
  nativeDocx: Boolean(mammoth?.extractRawText),
  sevenZip: Boolean(sevenZip),
  pdfToText: Boolean(pdfToText),
  office: Boolean(office),
  sevenZipPath: sevenZip,
  pdfToTextPath: pdfToText,
  officePath: office,
  nativePdfError,
  nativeDocxError,
};

function cleanText(text) {
  return String(text ?? "")
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function hashFile(filePath) {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(filePath, "r");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytes;
    while ((bytes = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, bytes));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
}

function writeTextRecord(file, text, engine) {
  const cleaned = cleanText(text);
  const target = path.join(outputRoot, "text", `${file.id}.txt`);
  fs.writeFileSync(target, cleaned, "utf8");
  return {
    textPath: target.replaceAll("\\", "/"),
    textChars: cleaned.length,
    textSha256: hashText(cleaned),
    engine,
  };
}

function writePageRecord(file, pageRecord) {
  const target = path.join(outputRoot, "pages", `${file.id}.json`);
  fs.writeFileSync(target, JSON.stringify(pageRecord, null, 2), "utf8");
  return target.replaceAll("\\", "/");
}

function buildDuplicateCanonicalMap() {
  const map = new Map();
  const exactSets = Array.isArray(manifest?.duplicateSets?.exact) ? manifest.duplicateSets.exact : [];
  for (const group of exactSets) {
    if (!Array.isArray(group) || group.length < 2) continue;
    const canonical = group[0];
    for (let i = 1; i < group.length; i += 1) map.set(group[i], canonical);
  }
  return map;
}

const duplicateCanonical = buildDuplicateCanonicalMap();

function readPlainText(filePath, file) {
  return { status: "extracted", ...writeTextRecord(file, fs.readFileSync(filePath, "utf8"), "node:text") };
}

async function extractPdfNative(filePath, file) {
  if (!pdfjs?.getDocument) {
    return { status: "blocked", reason: nativePdfError || "Native PDF.js unavailable" };
  }

  const source = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjs.getDocument({
    data: source,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
    verbosity: 0,
  });

  const document = await loadingTask.promise;
  const pages = [];
  let totalTextChars = 0;

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const lines = [];
      let line = "";

      for (const item of textContent.items || []) {
        if (!("str" in item)) continue;
        const value = String(item.str || "");
        if (value) line += (line && !line.endsWith(" ") ? " " : "") + value;
        if (item.hasEOL) {
          if (line.trim()) lines.push(line.trim());
          line = "";
        }
      }
      if (line.trim()) lines.push(line.trim());

      const pageText = cleanText(lines.join("\n"));
      totalTextChars += pageText.length;
      pages.push({
        page: pageNumber,
        text: pageText,
        textChars: pageText.length,
        textSha256: hashText(pageText),
      });
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }

  const joined = pages
    .map((entry) => `--- PAGE ${entry.page} ---\n${entry.text}`)
    .join("\n\n");

  const textRecord = writeTextRecord(file, joined, "pdfjs");
  const pagePath = writePageRecord(file, {
    version: 1,
    sourceId: file.id,
    sourcePath: file.path,
    filename: file.filename,
    pageCount: pages.length,
    pages,
  });

  return {
    status: totalTextChars > 0 ? "extracted" : "needs-vision",
    ...textRecord,
    pagePath,
    pageCount: pages.length,
    sourceTextChars: totalTextChars,
    engine: "pdfjs",
    note: totalTextChars > 0 ? null : "PDF.js found pages but no extractable text; likely scanned/image-only.",
  };
}

function extractPdfExternal(filePath, file) {
  if (!pdfToText) return { status: "blocked", reason: "pdftotext unavailable" };
  const target = path.join(outputRoot, "text", `${file.id}.txt`);
  const result = spawnSync(pdfToText, ["-layout", "-enc", "UTF-8", filePath, target], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 120000,
  });
  if (result.error || result.status !== 0 || !fs.existsSync(target)) {
    return { status: "error", reason: cleanText(result.stderr || result.error?.message || "pdftotext failed") };
  }
  const text = cleanText(fs.readFileSync(target, "utf8"));
  fs.writeFileSync(target, text, "utf8");
  return {
    status: text.length ? "extracted" : "needs-vision",
    textPath: target.replaceAll("\\", "/"),
    textChars: text.length,
    textSha256: hashText(text),
    engine: "pdftotext",
    note: text.length ? null : "PDF yielded no text and may be image-only/scanned.",
  };
}

async function extractPdf(filePath, file) {
  if (pdfjs?.getDocument) {
    try {
      return await extractPdfNative(filePath, file);
    } catch (error) {
      if (!pdfToText) {
        return { status: "error", reason: `PDF.js failed: ${error?.message || String(error)}`, engine: "pdfjs" };
      }
      const fallback = extractPdfExternal(filePath, file);
      return {
        ...fallback,
        note: [`PDF.js failed: ${error?.message || String(error)}`, fallback.note].filter(Boolean).join(" | "),
      };
    }
  }
  return extractPdfExternal(filePath, file);
}

async function extractDocx(filePath, file) {
  if (!mammoth?.extractRawText) {
    return { status: "blocked", reason: nativeDocxError || "Mammoth unavailable" };
  }

  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const record = writeTextRecord(file, result.value || "", "mammoth:raw-text");
    return {
      status: record.textChars ? "extracted" : "needs-review",
      ...record,
      warnings: (result.messages || []).map((message) => message.message || String(message)).slice(0, 20),
    };
  } catch (error) {
    return { status: "error", reason: `Mammoth failed: ${error?.message || String(error)}`, engine: "mammoth" };
  }
}

function extractLegacyOffice(filePath, file) {
  if (!office) return { status: "blocked", reason: "Legacy DOC/RTF requires LibreOffice/soffice" };

  const workDir = path.resolve(outputRoot, "work", file.id);
  fs.mkdirSync(workDir, { recursive: true });

  const result = spawnSync(office, [
    "--headless",
    "--convert-to", "txt:Text",
    "--outdir", workDir,
    filePath,
  ], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 120000,
  });

  if (result.error || result.status !== 0) {
    return { status: "error", reason: cleanText(result.stderr || result.error?.message || "LibreOffice conversion failed") };
  }

  const outputs = fs.readdirSync(workDir).filter((name) => name.toLowerCase().endsWith(".txt"));
  if (!outputs.length) return { status: "error", reason: "LibreOffice produced no text output" };

  const generated = path.join(workDir, outputs[0]);
  const record = writeTextRecord(file, fs.readFileSync(generated, "utf8"), "libreoffice:text");
  return { status: record.textChars ? "extracted" : "needs-review", ...record };
}

function indexImage(filePath, file) {
  const ext = path.extname(file.filename).toLowerCase();
  const destination = path.join(outputRoot, "assets", `${file.id}${ext}`);
  fs.copyFileSync(filePath, destination);
  return {
    status: "asset-indexed",
    assetPath: destination.replaceAll("\\", "/"),
    byteSize: fs.statSync(destination).size,
    sha256: hashFile(destination),
    engine: "node:copy",
  };
}

function listArchive(filePath, file) {
  if (!sevenZip) return { status: "blocked", reason: "7-Zip unavailable" };

  const listResult = spawnSync(sevenZip, ["l", "-slt", filePath], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 120000,
  });
  if (listResult.error || listResult.status !== 0) {
    return { status: "error", reason: cleanText(listResult.stderr || listResult.error?.message || "7-Zip listing failed") };
  }

  const listingPath = path.join(outputRoot, "archives", `${file.id}.txt`);
  fs.writeFileSync(listingPath, listResult.stdout, "utf8");

  const pathLines = listResult.stdout.split(/\r?\n/).filter((line) => line.startsWith("Path = "));
  const memberCount = Math.max(0, pathLines.length - 1);

  let extractedPath = null;
  if (extractArchives) {
    extractedPath = path.join(outputRoot, "archives", file.id);
    fs.mkdirSync(extractedPath, { recursive: true });
    const extractResult = spawnSync(sevenZip, ["x", "-y", `-o${extractedPath}`, filePath], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 300000,
    });
    if (extractResult.error || extractResult.status !== 0) {
      return {
        status: "indexed-with-extract-error",
        listingPath: listingPath.replaceAll("\\", "/"),
        memberCount,
        reason: cleanText(extractResult.stderr || extractResult.error?.message || "7-Zip extraction failed"),
        engine: "7zip",
      };
    }
  }

  return {
    status: extractArchives ? "archive-extracted" : "archive-indexed",
    listingPath: listingPath.replaceAll("\\", "/"),
    extractedPath: extractedPath?.replaceAll("\\", "/") || null,
    memberCount,
    engine: "7zip",
  };
}

async function extractOne(file) {
  const duplicateOf = duplicateCanonical.get(file.id);
  if (duplicateOf && !includeDuplicates) {
    return {
      id: file.id,
      sourcePath: file.path,
      filename: file.filename,
      kind: file.kind,
      extension: file.extension,
      sourceExists: true,
      processedAt: new Date().toISOString(),
      status: "duplicate-skipped",
      duplicateOf,
      note: "Exact duplicate skipped; derived content should reference canonical source.",
    };
  }

  const filePath = path.join(sourceRoot, ...String(file.path || "").split("/"));
  const result = {
    id: file.id,
    sourcePath: file.path,
    filename: file.filename,
    kind: file.kind,
    extension: file.extension,
    sourceExists: fs.existsSync(filePath),
    processedAt: new Date().toISOString(),
    status: "pending",
  };

  if (!result.sourceExists) {
    return { ...result, status: "missing", reason: "Source path not found beneath extraction root" };
  }

  try {
    const ext = String(file.extension || path.extname(filePath)).toLowerCase();
    const plain = [".txt", ".md", ".csv", ".json", ".html", ".htm"];

    let extracted;
    if (plain.includes(ext)) {
      extracted = readPlainText(filePath, file);
    } else if (ext === ".pdf") {
      extracted = await extractPdf(filePath, file);
    } else if (ext === ".docx") {
      extracted = await extractDocx(filePath, file);
    } else if ([".doc", ".rtf"].includes(ext)) {
      extracted = extractLegacyOffice(filePath, file);
    } else if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".tif", ".tiff", ".bmp", ".svg"].includes(ext)) {
      extracted = indexImage(filePath, file);
    } else if ([".rar", ".zip", ".7z"].includes(ext)) {
      extracted = listArchive(filePath, file);
    } else {
      extracted = { status: "unsupported", reason: `No extractor configured for ${ext || "(no extension)"}` };
    }

    return { ...result, ...extracted };
  } catch (error) {
    return { ...result, status: "error", reason: error?.message || String(error) };
  }
}

const results = [];
for (let index = 0; index < files.length; index += 1) {
  const file = files[index];
  const result = await extractOne(file);
  results.push(result);

  const count = index + 1;
  if (count === 1 || count % 10 === 0 || count === files.length) {
    console.log(`[${count}/${files.length}] ${result.status}: ${file.filename}`);
  }
}

const counts = results.reduce((acc, item) => {
  acc[item.status] = (acc[item.status] || 0) + 1;
  return acc;
}, {});

const extraction = {
  version: 2,
  generatedAt: new Date().toISOString(),
  sourceRoot,
  manifestPath: manifestPath.replaceAll("\\", "/"),
  outputRoot: outputRoot.replaceAll("\\", "/"),
  capabilities,
  summary: {
    requested: files.length,
    ...counts,
    textRecords: results.filter((item) => item.textPath).length,
    assetRecords: results.filter((item) => item.assetPath).length,
    archiveRecords: results.filter((item) => item.listingPath).length,
    pageMappedRecords: results.filter((item) => item.pagePath).length,
    totalPages: results.reduce((sum, item) => sum + Number(item.pageCount || 0), 0),
    needsVision: results.filter((item) => item.status === "needs-vision").length,
    exactDuplicatesSkipped: results.filter((item) => item.status === "duplicate-skipped").length,
  },
  records: results,
};

fs.writeFileSync(path.join(outputRoot, "extraction-report.json"), JSON.stringify(extraction, null, 2), "utf8");

const websiteReport = {
  version: extraction.version,
  generatedAt: extraction.generatedAt,
  capabilities,
  summary: extraction.summary,
  records: results.map((item) => ({
    id: item.id,
    filename: item.filename,
    kind: item.kind,
    extension: item.extension,
    status: item.status,
    engine: item.engine || null,
    duplicateOf: item.duplicateOf || null,
    textPath: item.textPath || null,
    pagePath: item.pagePath || null,
    pageCount: item.pageCount ?? null,
    assetPath: item.assetPath || null,
    listingPath: item.listingPath || null,
    memberCount: item.memberCount ?? null,
    textChars: item.textChars ?? null,
    sourceTextChars: item.sourceTextChars ?? null,
    reason: item.reason || null,
    note: item.note || null,
    warnings: item.warnings || [],
  })),
};

fs.writeFileSync("public/arcanum/extraction-report.json", JSON.stringify(websiteReport, null, 2), "utf8");

console.log("\nExtraction complete.");
console.log(JSON.stringify({ capabilities, summary: extraction.summary }, null, 2));
console.log("Wrote public/arcanum/extracted/extraction-report.json");
console.log("Wrote public/arcanum/extraction-report.json");
