#!/usr/bin/env node
/**
 * Arcanum OCR targeted repair v2.
 *
 * - Re-OCRs only audit repair candidates.
 * - Uses multiple Tesseract page-segmentation modes.
 * - Never replaces useful text with weaker output.
 * - Automatically reverts obviously weak prior "repairs" from the v1 tool.
 * - Marks pages exhausted after multipass failure so later audits do not
 *   repeatedly spend time on the same page unless --retry-exhausted is used.
 */
import fs from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && index + 1 < process.argv.length ? process.argv[index + 1] : fallback;
}

const rootArg = argValue("--root");
const auditPath = path.resolve(argValue("--audit", "public/arcanum/ocr/quality-audit.json"));
const ocrRoot = path.resolve(argValue("--ocr-root", "public/arcanum/ocr"));
const maxPages = Math.max(1, Number(argValue("--max-pages", "100") || 100));
const width = Math.max(1800, Number(argValue("--width", "3200") || 3200));
const minAcceptConfidence = Math.max(0, Number(argValue("--min-confidence", "55") || 55));
const minRecoveredChars = Math.max(4, Number(argValue("--min-recovered-chars", "12") || 12));
const retryExhausted = process.argv.includes("--retry-exhausted");
const languages = String(argValue("--langs", "eng,chi_sim,chi_tra"))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!rootArg) {
  console.error('Usage: node tools/repair-arcanum-ocr.mjs --root "<library-root>" [--max-pages 100] [--width 3200] [--retry-exhausted]');
  process.exit(1);
}
if (!fs.existsSync(auditPath)) {
  throw new Error(`Audit not found: ${auditPath}. Run npm run arcanum:ocr:audit first.`);
}

const libraryRoot = path.resolve(rootArg);
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8").replace(/^\uFEFF/, ""));
const textRoot = path.join(ocrRoot, "text");
const pageRoot = path.join(ocrRoot, "pages");
const qualityRoot = path.join(ocrRoot, "quality");
const repairRoot = path.join(qualityRoot, "repairs");
const reportPath = path.join(ocrRoot, "repair-report.json");

fs.mkdirSync(textRoot, { recursive: true });
fs.mkdirSync(pageRoot, { recursive: true });
fs.mkdirSync(qualityRoot, { recursive: true });
fs.mkdirSync(repairRoot, { recursive: true });

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

function restoreWeakPriorRepairs() {
  if (!fs.existsSync(reportPath)) return 0;
  const previous = readJson(reportPath);
  if (!previous) return 0;

  let restored = 0;
  for (const result of previous.results || []) {
    if (
      result?.accepted !== true ||
      Number(result?.previousChars || 0) !== 0 ||
      Number(result?.textChars || 0) >= minRecoveredChars
    ) {
      continue;
    }

    const pageBase = result.pageBase;
    if (!pageBase) continue;
    const beforePath = path.join(repairRoot, `${pageBase}.before.txt`);
    const textPath = path.join(textRoot, `${pageBase}.txt`);
    if (!fs.existsSync(beforePath)) continue;

    fs.writeFileSync(textPath, fs.readFileSync(beforePath, "utf8"), "utf8");
    const qualityPath = path.join(qualityRoot, `${pageBase}.json`);
    const quality = readJson(qualityPath) || {};
    fs.writeFileSync(
      qualityPath,
      JSON.stringify({
        ...quality,
        accepted: false,
        revertedWeakRepair: true,
        exhausted: false,
        confidence: null,
        textChars: 0,
      }, null, 2),
      "utf8",
    );
    restored += 1;
  }
  return restored;
}

const restoredWeakRepairs = restoreWeakPriorRepairs();

const candidates = [];
for (const doc of audit.documents || []) {
  for (const page of doc.flaggedPages || []) {
    if (!page.repair) continue;
    const pageBase = page.pageBase || `${doc.id}-p${String(page.page).padStart(5, "0")}`;
    const quality = readJson(path.join(qualityRoot, `${pageBase}.json`));
    if (!retryExhausted && quality?.exhausted === true) continue;

    const chars = Number(page.chars || 0);
    const reasons = page.reasons || [];
    const priority =
      reasons.includes("low-confidence") && chars > 0 ? 0 :
      reasons.includes("empty") ? 1 :
      reasons.includes("missing") ? 2 : 3;

    candidates.push({ doc, page, pageBase, priority });
  }
}

candidates.sort((a, b) => a.priority - b.priority || a.doc.filename.localeCompare(b.doc.filename) || a.page.page - b.page.page);

console.log(`Repair queue: ${candidates.length} candidate pages; processing up to ${maxPages}.`);
console.log(`Render width: ${width}px · Languages: ${languages.join(", ")} · multipass PSM 3/6/11`);
if (restoredWeakRepairs) console.log(`Restored ${restoredWeakRepairs} weak v1 repair(s) from backup before continuing.`);

const worker = await createWorker(languages, 1, {
  logger: (message) => {
    if (message.status === "recognizing text" && typeof message.progress === "number") {
      process.stdout.write(`\rOCR ${Math.round(message.progress * 100)}%   `);
    }
  },
});

const results = [];
let processed = 0;
let accepted = 0;
let improved = 0;
let exhausted = 0;
let recoveredEmpty = 0;
const touchedDocs = new Set();

function normalizeConfidence(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value))
    ? Number(value)
    : null;
}

function scoreAttempt(attempt) {
  const chars = attempt.text.length;
  const confidence = attempt.confidence || 0;
  if (!chars) return 0;
  return (Math.min(chars, 2200) / 22) + confidence * 1.6;
}

async function recognizePass(imageBuffer, psm) {
  await worker.setParameters({
    tessedit_pageseg_mode: String(psm),
    preserve_interword_spaces: "1",
  });
  const recognition = await worker.recognize(imageBuffer);
  process.stdout.write("\r                    \r");
  return {
    psm,
    text: String(recognition?.data?.text || "").trim(),
    confidence: Number(recognition?.data?.confidence || 0),
  };
}

function shouldAccept(page, oldText, oldConfidence, attempt) {
  const oldChars = oldText.trim().length;
  const newChars = attempt.text.length;
  const confidence = attempt.confidence;
  const reasons = page.reasons || [];

  if (!oldChars) {
    return newChars >= minRecoveredChars && confidence >= 35;
  }
  if (!newChars) return false;

  if (reasons.includes("low-confidence") && oldConfidence !== null) {
    const confidenceGain = confidence - oldConfidence;
    const lengthRatio = newChars / Math.max(oldChars, 1);
    return (
      (confidence >= minAcceptConfidence && confidenceGain >= 5 && lengthRatio >= 0.62) ||
      (confidenceGain >= 10 && lengthRatio >= 0.5) ||
      (newChars >= Math.ceil(oldChars * 1.28) && confidence >= oldConfidence)
    );
  }

  if (reasons.includes("short")) {
    return newChars >= Math.max(minRecoveredChars, Math.ceil(oldChars * 1.35)) && confidence >= 35;
  }

  if (reasons.includes("missing")) {
    return newChars >= minRecoveredChars && confidence >= 35;
  }

  return confidence >= minAcceptConfidence && newChars > oldChars;
}

try {
  for (const candidate of candidates) {
    if (processed >= maxPages) break;

    const { doc, page, pageBase } = candidate;
    const sourcePath = path.join(libraryRoot, ...String(doc.sourcePath || "").split("/"));
    const textPath = path.join(textRoot, `${pageBase}.txt`);
    const qualityPath = path.join(qualityRoot, `${pageBase}.json`);
    const existingQuality = readJson(qualityPath);
    const oldText = fs.existsSync(textPath) ? fs.readFileSync(textPath, "utf8") : "";
    const oldConfidence = normalizeConfidence(
      page.confidence ?? existingQuality?.previousConfidence ?? existingQuality?.confidence
    );

    if (!fs.existsSync(sourcePath)) {
      results.push({ id: doc.id, filename: doc.filename, page: page.page, pageBase, status: "missing-source" });
      continue;
    }

    const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(sourcePath)) });
    try {
      const screenshot = await parser.getScreenshot({
        partial: [page.page],
        desiredWidth: width,
        imageDataUrl: false,
        imageBuffer: true,
      });
      const image = screenshot?.pages?.[0]?.data;
      if (!image) {
        results.push({ id: doc.id, filename: doc.filename, page: page.page, pageBase, status: "render-error" });
        continue;
      }

      const imageBuffer = Buffer.from(image);
      fs.writeFileSync(path.join(pageRoot, `${pageBase}.png`), imageBuffer);

      const attempts = [];
      for (const psm of [3, 6, 11]) {
        const attempt = await recognizePass(imageBuffer, psm);
        attempts.push(attempt);

        if (
          shouldAccept(page, oldText, oldConfidence, attempt) &&
          attempt.confidence >= 70 &&
          attempt.text.length >= Math.max(minRecoveredChars, oldText.trim().length * 0.9)
        ) {
          break;
        }
      }

      attempts.sort((a, b) => scoreAttempt(b) - scoreAttempt(a));
      const best = attempts[0] || { psm: 3, text: "", confidence: 0 };
      const accept = shouldAccept(page, oldText, oldConfidence, best);

      if (accept) {
        const beforePath = path.join(repairRoot, `${pageBase}.before.txt`);
        const afterPath = path.join(repairRoot, `${pageBase}.after.txt`);
        if (!fs.existsSync(beforePath)) fs.writeFileSync(beforePath, oldText, "utf8");
        fs.writeFileSync(afterPath, best.text, "utf8");
        fs.writeFileSync(textPath, best.text, "utf8");
        accepted += 1;
        if (best.text.length > oldText.trim().length || (oldConfidence !== null && best.confidence > oldConfidence)) improved += 1;
        if (!oldText.trim().length) recoveredEmpty += 1;
        touchedDocs.add(doc.id);
      }

      const noUsableText = !accept && oldText.trim().length === 0 && attempts.every((attempt) => attempt.text.length < minRecoveredChars);
      const noBetterLowConfidence =
        !accept &&
        oldText.trim().length > 0 &&
        (page.reasons || []).includes("low-confidence");

      const effectiveConfidence = accept ? best.confidence : oldConfidence;
      const effectiveChars = accept ? best.text.length : oldText.trim().length;
      const improvedButStillLow =
        accept &&
        effectiveConfidence !== null &&
        effectiveConfidence < 50 &&
        (page.reasons || []).includes("low-confidence");

      const isExhausted = noUsableText || noBetterLowConfidence || improvedButStillLow;
      if (isExhausted) exhausted += 1;

      const quality = {
        id: doc.id,
        filename: doc.filename,
        sourcePath: doc.sourcePath,
        page: page.page,
        pageBase,
        measuredAt: new Date().toISOString(),
        renderWidth: width,
        languages,
        previousChars: oldText.trim().length,
        previousConfidence: oldConfidence,
        textChars: effectiveChars,
        confidence: effectiveConfidence,
        attemptConfidence: best.confidence,
        attemptChars: best.text.length,
        selectedPsm: best.psm,
        attempts: attempts.map((attempt) => ({
          psm: attempt.psm,
          textChars: attempt.text.length,
          confidence: attempt.confidence,
        })),
        reasons: page.reasons || [],
        accepted: accept,
        exhausted: isExhausted,
        exhaustedReason: noUsableText
          ? "no-usable-text-after-multipass"
          : noBetterLowConfidence
            ? "no-better-low-confidence-result"
            : improvedButStillLow
              ? "improved-but-still-low-confidence-after-multipass"
              : null,
      };
      fs.writeFileSync(qualityPath, JSON.stringify(quality, null, 2), "utf8");

      results.push({ ...quality, status: accept ? "accepted" : isExhausted ? "exhausted" : "kept-existing" });
      processed += 1;
      console.log(
        `  ${doc.filename} · page ${page.page}: best ${best.text.length} chars · confidence ${best.confidence.toFixed(1)} · PSM ${best.psm} · ${accept ? "ACCEPTED" : isExhausted ? "EXHAUSTED" : "kept existing"}`
      );
    } catch (error) {
      results.push({
        id: doc.id,
        filename: doc.filename,
        page: page.page,
        pageBase,
        status: "repair-error",
        reason: error?.message || String(error),
      });
    } finally {
      await parser.destroy();
    }
  }
} finally {
  await worker.terminate();
}

for (const doc of audit.documents || []) {
  if (!touchedDocs.has(doc.id)) continue;
  const pages = [];
  for (let page = 1; page <= Number(doc.totalPages || 0); page += 1) {
    const pageBase = `${doc.id}-p${String(page).padStart(5, "0")}`;
    const textPath = path.join(textRoot, `${pageBase}.txt`);
    if (fs.existsSync(textPath)) {
      pages.push(`--- PAGE ${page} ---\n${fs.readFileSync(textPath, "utf8")}`);
    }
  }
  fs.writeFileSync(path.join(textRoot, `${doc.id}.txt`), pages.join("\n\n"), "utf8");
}

const output = {
  version: 2,
  generatedAt: new Date().toISOString(),
  auditPath: auditPath.replaceAll("\\", "/"),
  maxPages,
  renderWidth: width,
  restoredWeakRepairs,
  summary: {
    queued: candidates.length,
    processed,
    accepted,
    improved,
    recoveredEmpty,
    exhausted,
    keptExisting: processed - accepted,
    remainingAutomatic: Math.max(0, candidates.length - processed),
  },
  results,
};

fs.writeFileSync(reportPath, JSON.stringify(output, null, 2), "utf8");
console.log("\nArcanum targeted OCR repair v2 complete.");
console.log(JSON.stringify(output.summary, null, 2));
console.log(`Wrote ${reportPath}`);
