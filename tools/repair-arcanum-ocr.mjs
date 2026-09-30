#!/usr/bin/env node
/**
 * Selectively re-OCR only pages marked for repair by audit-arcanum-ocr.mjs.
 * Existing text is backed up and replaced only when the new result improves it.
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
const width = Math.max(1800, Number(argValue("--width", "2800") || 2800));
const minAcceptConfidence = Math.max(0, Number(argValue("--min-confidence", "55") || 55));
const languages = String(argValue("--langs", "eng,chi_sim,chi_tra")).split(",").map((v) => v.trim()).filter(Boolean);

if (!rootArg) {
  console.error('Usage: node tools/repair-arcanum-ocr.mjs --root "<library-root>" [--max-pages 100] [--width 2800]');
  process.exit(1);
}
if (!fs.existsSync(auditPath)) throw new Error(`Audit not found: ${auditPath}. Run npm run arcanum:ocr:audit first.`);

const libraryRoot = path.resolve(rootArg);
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8").replace(/^\uFEFF/, ""));
const textRoot = path.join(ocrRoot, "text");
const pageRoot = path.join(ocrRoot, "pages");
const qualityRoot = path.join(ocrRoot, "quality");
const repairRoot = path.join(qualityRoot, "repairs");
fs.mkdirSync(textRoot, { recursive: true });
fs.mkdirSync(pageRoot, { recursive: true });
fs.mkdirSync(qualityRoot, { recursive: true });
fs.mkdirSync(repairRoot, { recursive: true });

const candidates = [];
for (const doc of audit.documents || []) {
  for (const page of doc.flaggedPages || []) {
    if (page.repair) candidates.push({ doc, page });
  }
}

console.log(`Repair queue: ${candidates.length} candidate pages; processing up to ${maxPages}.`);
console.log(`Render width: ${width}px · Languages: ${languages.join(", ")}`);

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
const touchedDocs = new Set();

function shouldAccept(candidate, oldText, newText, newConfidence) {
  const oldChars = oldText.trim().length;
  const newChars = newText.trim().length;
  const reasons = candidate.page.reasons || [];
  const oldConfidence = Number.isFinite(Number(candidate.page.confidence)) ? Number(candidate.page.confidence) : null;

  if (!oldChars) return newChars > 0;
  if (!newChars) return false;
  if (reasons.includes("low-confidence") && oldConfidence !== null) {
    return newConfidence >= Math.max(minAcceptConfidence, oldConfidence + 3) || newChars >= Math.ceil(oldChars * 1.25);
  }
  if (reasons.includes("short")) {
    return newChars >= Math.ceil(oldChars * 1.35) || (newConfidence >= minAcceptConfidence && newChars > oldChars);
  }
  if (reasons.includes("missing")) return newChars > 0;
  return newConfidence >= minAcceptConfidence && newChars > oldChars;
}

try {
  for (const { doc, page } of candidates) {
    if (processed >= maxPages) break;

    const pageBase = page.pageBase || `${doc.id}-p${String(page.page).padStart(5, "0")}`;
    const currentTextPath = path.join(textRoot, `${pageBase}.txt`);
    if ((page.reasons || []).includes("missing") && fs.existsSync(currentTextPath)) {
      const currentText = fs.readFileSync(currentTextPath, "utf8").trim();
      if (currentText.length > 0) {
        results.push({
          id: doc.id,
          filename: doc.filename,
          page: page.page,
          pageBase,
          status: "resolved-before-repair",
          textChars: currentText.length,
        });
        continue;
      }
    }

    const sourcePath = path.join(libraryRoot, ...String(doc.sourcePath || "").split("/"));
    if (!fs.existsSync(sourcePath)) {
      results.push({ id: doc.id, filename: doc.filename, page: page.page, status: "missing-source" });
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
        results.push({ id: doc.id, filename: doc.filename, page: page.page, status: "render-error" });
        continue;
      }

      const imageBuffer = Buffer.from(image);
      const imagePath = path.join(pageRoot, `${pageBase}.png`);
      const textPath = path.join(textRoot, `${pageBase}.txt`);
      const oldText = fs.existsSync(textPath) ? fs.readFileSync(textPath, "utf8") : "";

      fs.writeFileSync(imagePath, imageBuffer);
      const recognition = await worker.recognize(imageBuffer);
      process.stdout.write("\r                    \r");
      const newText = String(recognition?.data?.text || "").trim();
      const confidence = Number(recognition?.data?.confidence || 0);
      const accept = shouldAccept({ doc, page }, oldText, newText, confidence);

      if (accept) {
        const beforePath = path.join(repairRoot, `${pageBase}.before.txt`);
        const afterPath = path.join(repairRoot, `${pageBase}.after.txt`);
        if (!fs.existsSync(beforePath)) fs.writeFileSync(beforePath, oldText, "utf8");
        fs.writeFileSync(afterPath, newText, "utf8");
        fs.writeFileSync(textPath, newText, "utf8");
        accepted += 1;
        if (newText.length > oldText.trim().length) improved += 1;
        touchedDocs.add(doc.id);
      }

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
        textChars: newText.length,
        confidence,
        reasons: page.reasons || [],
        accepted: accept,
      };
      fs.writeFileSync(path.join(qualityRoot, `${pageBase}.json`), JSON.stringify(quality, null, 2), "utf8");

      results.push({ ...quality, status: accept ? "accepted" : "kept-existing" });
      processed += 1;
      console.log(`  ${doc.filename} · page ${page.page}: ${newText.length} chars · confidence ${confidence.toFixed(1)} · ${accept ? "ACCEPTED" : "kept existing"}`);
    } catch (error) {
      results.push({ id: doc.id, filename: doc.filename, page: page.page, status: "repair-error", reason: error?.message || String(error) });
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
    if (fs.existsSync(textPath)) pages.push(`--- PAGE ${page} ---\n${fs.readFileSync(textPath, "utf8")}`);
  }
  fs.writeFileSync(path.join(textRoot, `${doc.id}.txt`), pages.join("\n\n"), "utf8");
}

const output = {
  version: 1,
  generatedAt: new Date().toISOString(),
  auditPath: auditPath.replaceAll("\\", "/"),
  maxPages,
  renderWidth: width,
  summary: {
    queued: candidates.length,
    processed,
    accepted,
    improved,
    keptExisting: processed - accepted,
    remaining: Math.max(0, candidates.length - processed),
  },
  results,
};

const reportPath = path.join(ocrRoot, "repair-report.json");
fs.writeFileSync(reportPath, JSON.stringify(output, null, 2), "utf8");
console.log("\nArcanum targeted OCR repair complete.");
console.log(JSON.stringify(output.summary, null, 2));
console.log(`Wrote ${reportPath}`);
