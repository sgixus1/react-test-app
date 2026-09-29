#!/usr/bin/env node
/**
 * Arcanum Archive source extraction engine.
 *
 * Reads public/arcanum/source-manifest.json and an extracted source root.
 * It never edits the original library. Outputs are written beneath:
 *   public/arcanum/extracted/
 *
 * Built-in support:
 *   .txt .md .json .csv .html .htm
 *
 * Optional external tools:
 *   PDF      -> pdftotext
 *   DOC/DOCX -> soffice/libreoffice (converted to txt)
 *   ZIP/RAR/7Z -> 7z / 7z.exe (asset listing + optional extraction)
 *
 * Usage:
 *   node tools/extract-arcanum-sources.mjs --root "D:\\Magic-Library"
 *   node tools/extract-arcanum-sources.mjs --root ./fixtures --limit 20
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

if (!rootArg) {
  console.error('Usage: node tools/extract-arcanum-sources.mjs --root "<extracted-library-root>" [--limit N] [--extract-archives]');
  process.exit(1);
}

const sourceRoot = path.resolve(rootArg);
if (!fs.existsSync(sourceRoot)) throw new Error(`Source root does not exist: ${sourceRoot}`);
if (!fs.existsSync(manifestPath)) throw new Error(`Manifest not found: ${manifestPath}`);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const manifestFiles = Array.isArray(manifest.files) ? manifest.files : [];
const files = limitArg > 0 ? manifestFiles.slice(0, limitArg) : manifestFiles;

fs.mkdirSync(outputRoot, { recursive: true });
fs.mkdirSync(path.join(outputRoot, "text"), { recursive: true });
fs.mkdirSync(path.join(outputRoot, "assets"), { recursive: true });
fs.mkdirSync(path.join(outputRoot, "archives"), { recursive: true });
fs.mkdirSync(path.join(outputRoot, "work"), { recursive: true });

function commandExists(command, args = ["--version"]) {
  try {
    const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true, timeout: 5000 });
    return !result.error && (result.status === 0 || result.status === 1);
  } catch {
    return false;
  }
}

function firstAvailable(commands) {
  for (const candidate of commands) {
    if (candidate && commandExists(candidate.command, candidate.args)) return candidate.command;
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

const capabilities = {
  sevenZip: Boolean(sevenZip),
  pdfToText: Boolean(pdfToText),
  office: Boolean(office),
  sevenZipPath: sevenZip,
  pdfToTextPath: pdfToText,
  officePath: office,
};

function cleanText(text) {
  return String(text ?? "")
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
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
    textSha256: crypto.createHash("sha256").update(cleaned).digest("hex"),
    engine,
  };
}

function readPlainText(filePath, file) {
  return writeTextRecord(file, fs.readFileSync(filePath, "utf8"), "node:text");
}

function extractPdf(filePath, file) {
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
    textSha256: crypto.createHash("sha256").update(text).digest("hex"),
    engine: "pdftotext",
    note: text.length ? null : "PDF yielded no text and may be image-only/scanned.",
  };
}

function extractOffice(filePath, file) {
  if (!office) return { status: "blocked", reason: "LibreOffice/soffice unavailable" };

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

function extractOne(file) {
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
    result.status = "missing";
    result.reason = "Source path not found beneath extraction root";
    return result;
  }

  try {
    const ext = String(file.extension || path.extname(filePath)).toLowerCase();
    const plain = [".txt", ".md", ".csv", ".json", ".html", ".htm"];

    let extracted;
    if (plain.includes(ext)) {
      extracted = { status: "extracted", ...readPlainText(filePath, file) };
    } else if (ext === ".pdf") {
      extracted = extractPdf(filePath, file);
    } else if ([".doc", ".docx", ".rtf"].includes(ext)) {
      extracted = extractOffice(filePath, file);
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

const results = files.map(extractOne);

const counts = results.reduce((acc, item) => {
  acc[item.status] = (acc[item.status] || 0) + 1;
  return acc;
}, {});

const extraction = {
  version: 1,
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
    needsVision: results.filter((item) => item.status === "needs-vision").length,
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
    textPath: item.textPath || null,
    assetPath: item.assetPath || null,
    listingPath: item.listingPath || null,
    memberCount: item.memberCount ?? null,
    textChars: item.textChars ?? null,
    reason: item.reason || null,
    note: item.note || null,
  })),
};
fs.writeFileSync("public/arcanum/extraction-report.json", JSON.stringify(websiteReport, null, 2), "utf8");

console.log(JSON.stringify({ capabilities, summary: extraction.summary }, null, 2));
console.log("Wrote public/arcanum/extracted/extraction-report.json");
console.log("Wrote public/arcanum/extraction-report.json");
