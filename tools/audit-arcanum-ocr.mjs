#!/usr/bin/env node
/**
 * Audit the Arcanum OCR cache without re-running OCR.
 * Finds missing pages, empty OCR, suspiciously short text, and low-confidence
 * pages when confidence metadata is available.
 */
import fs from "node:fs";
import path from "node:path";

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && index + 1 < process.argv.length ? process.argv[index + 1] : fallback;
}

const extractionReportPath = argValue("--report", "public/arcanum/extracted/extraction-report.json");
const ocrRoot = path.resolve(argValue("--ocr-root", "public/arcanum/ocr"));
const outPath = path.resolve(argValue("--out", path.join(ocrRoot, "quality-audit.json")));
const shortThreshold = Math.max(0, Number(argValue("--short-chars", "80") || 80));
const lowConfidence = Math.max(0, Number(argValue("--low-confidence", "50") || 50));
const reviewConfidence = Math.max(lowConfidence, Number(argValue("--review-confidence", "70") || 70));
const includeShort = process.argv.includes("--include-short");

if (!fs.existsSync(extractionReportPath)) throw new Error(`Extraction report not found: ${extractionReportPath}`);

const extraction = JSON.parse(fs.readFileSync(extractionReportPath, "utf8").replace(/^\uFEFF/, ""));
const sources = (extraction.records || []).filter((record) => record.status === "needs-vision");
const textRoot = path.join(ocrRoot, "text");
const qualityRoot = path.join(ocrRoot, "quality");
const latestReportPath = path.join(ocrRoot, "ocr-report.json");

const latestConfidence = new Map();
if (fs.existsSync(latestReportPath)) {
  try {
    const latest = JSON.parse(fs.readFileSync(latestReportPath, "utf8").replace(/^\uFEFF/, ""));
    for (const record of latest.records || []) {
      for (const page of record.pages || []) {
        if (Number.isFinite(Number(page.confidence))) latestConfidence.set(`${record.id}:${page.page}`, Number(page.confidence));
      }
    }
  } catch {
    // Audit remains useful even if an old report is malformed.
  }
}

function qualityMeta(id, page, pageBase) {
  const qualityPath = path.join(qualityRoot, `${pageBase}.json`);
  if (fs.existsSync(qualityPath)) {
    try {
      return JSON.parse(fs.readFileSync(qualityPath, "utf8").replace(/^\uFEFF/, ""));
    } catch {
      return null;
    }
  }
  const confidence = latestConfidence.get(`${id}:${page}`);
  return Number.isFinite(confidence) ? { confidence, source: "latest-report" } : null;
}

const documents = [];
const totals = {
  documents: sources.length,
  expectedPages: 0,
  cachedPages: 0,
  missingPages: 0,
  emptyPages: 0,
  shortPages: 0,
  lowConfidencePages: 0,
  reviewConfidencePages: 0,
  repairCandidates: 0,
  confidenceKnownPages: 0,
};

for (const source of sources) {
  const totalPages = Number(source.pageCount || source.totalPages || 0);
  totals.expectedPages += totalPages;
  const flaggedPages = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const pageBase = `${source.id}-p${String(page).padStart(5, "0")}`;
    const textPath = path.join(textRoot, `${pageBase}.txt`);
    const exists = fs.existsSync(textPath);
    const text = exists ? fs.readFileSync(textPath, "utf8").trim() : "";
    const chars = text.length;
    const meta = qualityMeta(source.id, page, pageBase);
    const confidence = Number.isFinite(Number(meta?.confidence)) ? Number(meta.confidence) : null;

    if (exists) totals.cachedPages += 1;
    if (!exists) totals.missingPages += 1;
    if (exists && chars === 0) totals.emptyPages += 1;
    if (exists && chars > 0 && chars < shortThreshold) totals.shortPages += 1;
    if (confidence !== null) totals.confidenceKnownPages += 1;
    if (confidence !== null && confidence < lowConfidence) totals.lowConfidencePages += 1;
    else if (confidence !== null && confidence < reviewConfidence) totals.reviewConfidencePages += 1;

    const reasons = [];
    if (!exists) reasons.push("missing");
    if (exists && chars === 0) reasons.push("empty");
    if (exists && chars > 0 && chars < shortThreshold) reasons.push("short");
    if (confidence !== null && confidence < lowConfidence) reasons.push("low-confidence");
    else if (confidence !== null && confidence < reviewConfidence) reasons.push("review-confidence");

    const repair = reasons.includes("missing") ||
      reasons.includes("empty") ||
      reasons.includes("low-confidence") ||
      (includeShort && reasons.includes("short"));

    if (repair) totals.repairCandidates += 1;

    if (reasons.length) {
      flaggedPages.push({
        page,
        pageBase,
        textPath: textPath.replaceAll("\\", "/"),
        chars,
        confidence,
        reasons,
        repair,
      });
    }
  }

  if (flaggedPages.length) {
    documents.push({
      id: source.id,
      filename: source.filename,
      sourcePath: source.sourcePath,
      totalPages,
      flaggedPages,
      repairCandidates: flaggedPages.filter((page) => page.repair).length,
    });
  }
}

const output = {
  version: 1,
  generatedAt: new Date().toISOString(),
  thresholds: { shortChars: shortThreshold, lowConfidence, reviewConfidence, includeShort },
  summary: totals,
  documents,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

const csvPath = outPath.replace(/\.json$/i, ".csv");
const rows = [["id","filename","page","chars","confidence","reasons","repair"]];
for (const doc of documents) {
  for (const page of doc.flaggedPages) {
    if (!page.repair) continue;
    rows.push([
      doc.id,
      doc.filename,
      page.page,
      page.chars,
      page.confidence ?? "",
      page.reasons.join("|"),
      page.repair ? "yes" : "no",
    ]);
  }
}
const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
fs.writeFileSync(csvPath, csv, "utf8");

console.log("Arcanum OCR quality audit complete.");
console.log(JSON.stringify(output.summary, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`Wrote ${csvPath}`);
