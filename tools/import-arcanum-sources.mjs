#!/usr/bin/env node
/**
 * Arcanum Archive source importer.
 *
 * Input: a JSON manifest generated from an extracted source tree.
 * The importer does not read or interpret magical content. It normalizes
 * provenance metadata, detects likely duplicates, and prepares records for
 * later text/image extraction.
 *
 * Usage:
 *   node tools/import-arcanum-sources.mjs import/source-files.json
 *
 * Input schema:
 * [
 *   {
 *     "path": "Magic Library/魔法阵/diagram-01.png",
 *     "size": 123456,
 *     "sha256": "optional",
 *     "mime": "image/png",
 *     "modified": "2026-09-29T00:00:00Z"
 *   }
 * ]
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node tools/import-arcanum-sources.mjs <source-files.json>");
  process.exit(1);
}

const inputText = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
const raw = JSON.parse(inputText);
if (!Array.isArray(raw)) {
  throw new Error("Input manifest must be a JSON array.");
}

const normalizeSlashes = (value) => String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
const extOf = (value) => path.extname(value).toLowerCase();
const basenameWithoutExt = (value) => path.basename(value, path.extname(value));

function normalizeStem(value) {
  return basenameWithoutExt(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\((?:copy|\d+)\)$/i, "")
    .replace(/[\s._-]+/g, "")
    .replace(/[【】《》〈〉「」『』（）()\[\]{}]/g, "");
}

function sourceKind(ext, mime = "") {
  if ([".pdf"].includes(ext)) return "document";
  if ([".doc", ".docx", ".txt", ".rtf", ".md"].includes(ext)) return "text-document";
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".tif", ".tiff", ".bmp", ".svg"].includes(ext) || mime.startsWith("image/")) return "image";
  if ([".rar", ".zip", ".7z", ".tar", ".gz"].includes(ext)) return "archive";
  if ([".epub", ".mobi"].includes(ext)) return "ebook";
  return "other";
}

function stableId(sourcePath) {
  return crypto.createHash("sha1").update(sourcePath).digest("hex").slice(0, 14);
}

const files = raw.map((item) => {
  const sourcePath = normalizeSlashes(item.path);
  const ext = extOf(sourcePath);
  return {
    id: stableId(sourcePath),
    path: sourcePath,
    filename: path.basename(sourcePath),
    stem: basenameWithoutExt(sourcePath),
    normalizedStem: normalizeStem(sourcePath),
    extension: ext,
    size: Number(item.size || 0),
    sha256: item.sha256 || null,
    mime: item.mime || null,
    modified: item.modified || null,
    kind: sourceKind(ext, item.mime || ""),
    status: "indexed",
    provenance: {
      sourceManifest: normalizeSlashes(inputPath),
      importedAt: new Date().toISOString(),
    },
  };
});

const exactGroups = new Map();
const likelyGroups = new Map();

for (const file of files) {
  if (file.sha256) {
    const key = `sha256:${file.sha256}`;
    if (!exactGroups.has(key)) exactGroups.set(key, []);
    exactGroups.get(key).push(file.id);
  }

  const likelyKey = `${file.normalizedStem}:${file.size}`;
  if (!likelyGroups.has(likelyKey)) likelyGroups.set(likelyKey, []);
  likelyGroups.get(likelyKey).push(file.id);
}

const exactDuplicateSets = [...exactGroups.values()].filter((group) => group.length > 1);
const likelyDuplicateSets = [...likelyGroups.values()].filter((group) => group.length > 1);

const exactDuplicateIds = new Set(exactDuplicateSets.flat());
const likelyDuplicateIds = new Set(likelyDuplicateSets.flat());

for (const file of files) {
  file.duplicate = {
    exact: exactDuplicateIds.has(file.id),
    likely: likelyDuplicateIds.has(file.id),
  };
}

const summary = {
  generatedAt: new Date().toISOString(),
  input: normalizeSlashes(inputPath),
  totalFiles: files.length,
  byKind: Object.groupBy
    ? Object.groupBy(files, (file) => file.kind)
    : files.reduce((acc, file) => {
        (acc[file.kind] ||= []).push(file);
        return acc;
      }, {}),
  exactDuplicateSets: exactDuplicateSets.length,
  likelyDuplicateSets: likelyDuplicateSets.length,
  imageFiles: files.filter((file) => file.kind === "image").length,
  documentFiles: files.filter((file) => ["document", "text-document", "ebook"].includes(file.kind)).length,
  archiveFiles: files.filter((file) => file.kind === "archive").length,
};

for (const [key, value] of Object.entries(summary.byKind)) {
  summary.byKind[key] = value.length;
}

const out = {
  version: 1,
  summary,
  duplicateSets: {
    exact: exactDuplicateSets,
    likely: likelyDuplicateSets,
  },
  files,
};

const outputPath = "public/arcanum/source-manifest.json";
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), "utf8");

const duplicateReport = {
  generatedAt: summary.generatedAt,
  exact: exactDuplicateSets.map((ids) => ids.map((id) => files.find((file) => file.id === id))),
  likely: likelyDuplicateSets.map((ids) => ids.map((id) => files.find((file) => file.id === id))),
};
fs.writeFileSync("public/arcanum/duplicate-report.json", JSON.stringify(duplicateReport, null, 2), "utf8");

console.log(JSON.stringify(summary, null, 2));
console.log(`Wrote ${outputPath}`);
console.log("Wrote public/arcanum/duplicate-report.json");
