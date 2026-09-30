#!/usr/bin/env node
/**
 * OCR queue for image-only/scanned PDFs already classified as needs-vision.
 *
 * Conservative defaults:
 *   - 1 document
 *   - first 5 pages
 * Use --all to process every queued scanned PDF and every page.
 *
 * Resumable: existing page OCR files are skipped unless --force is supplied.
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
const extractionReportPath = argValue("--report", "public/arcanum/extracted/extraction-report.json");
const outputRoot = argValue("--output", "public/arcanum/ocr");
const languages = String(argValue("--langs", "eng,chi_sim,chi_tra"))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const force = process.argv.includes("--force");
const processAll = process.argv.includes("--all");
const docLimit = Number(argValue("--limit-docs", processAll ? "0" : "1") || 0);
const pageLimit = Number(argValue("--max-pages", processAll ? "0" : "5") || 0);
const startDoc = Math.max(0, Number(argValue("--start-doc", "0") || 0));
const maxTotalPages = Math.max(0, Number(argValue("--max-total-pages", processAll ? "0" : "0") || 0));

if (!rootArg) {
  console.error('Usage: node tools/ocr-arcanum-scans.mjs --root "<library-root>" [--all] [--limit-docs N] [--max-pages N]');
  process.exit(1);
}

const libraryRoot = path.resolve(rootArg);
if (!fs.existsSync(libraryRoot)) throw new Error(`Library root not found: ${libraryRoot}`);
if (!fs.existsSync(extractionReportPath)) throw new Error(`Extraction report not found: ${extractionReportPath}`);

const report = JSON.parse(fs.readFileSync(extractionReportPath, "utf8").replace(/^\uFEFF/, ""));
const queued = (report.records || []).filter((record) => record.status === "needs-vision");
const sliced = queued.slice(startDoc);
const docs = docLimit > 0 ? sliced.slice(0, docLimit) : sliced;

fs.mkdirSync(outputRoot, { recursive: true });
fs.mkdirSync(path.join(outputRoot, "pages"), { recursive: true });
fs.mkdirSync(path.join(outputRoot, "text"), { recursive: true });\nfs.mkdirSync(path.join(outputRoot, "quality"), { recursive: true });

console.log(`OCR queue: ${queued.length} scanned PDFs; processing ${docs.length} starting at index ${startDoc}.`);
console.log(`Languages: ${languages.join(", ")}`);
console.log(processAll ? "Mode: ALL pages" : `Safe mode: up to ${pageLimit} pages per document`);

const worker = await createWorker(languages, 1, {
  logger: (message) => {
    if (message.status === "recognizing text" && typeof message.progress === "number") {
      process.stdout.write(`\rOCR ${Math.round(message.progress * 100)}%   `);
    }
  },
});

const records = [];
let newlyProcessedPages = 0;
let cachedPages = 0;
let totalPageBudgetUsed = 0;

try {
  for (let docIndex = 0; docIndex < docs.length; docIndex += 1) {
    const source = docs[docIndex];
    const sourcePath = path.join(libraryRoot, ...String(source.sourcePath || "").split("/"));

    if (!fs.existsSync(sourcePath)) {
      records.push({ id: source.id, filename: source.filename, status: "missing", sourcePath: source.sourcePath });
      continue;
    }

    const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(sourcePath)) });

    try {
      const info = await parser.getInfo({ parsePageInfo: false });
      const totalPages = Number(info?.total || source.pageCount || 0);
      const pageRecords = [];
      const remainingBatchBudget = maxTotalPages > 0
        ? Math.max(0, maxTotalPages - newlyProcessedPages)
        : Number.POSITIVE_INFINITY;
      const newPageTarget = pageLimit > 0
        ? Math.min(pageLimit, remainingBatchBudget)
        : remainingBatchBudget;

      if (newPageTarget <= 0) {
        console.log("\nPage budget reached; stopping OCR batch.");
        break;
      }

      console.log(`\n[${docIndex + 1}/${docs.length}] ${source.filename} — ${totalPages} pages, up to ${Number.isFinite(newPageTarget) ? newPageTarget : totalPages} new OCR pages`);

      let newPagesForDocument = 0;
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        const pageBase = `${source.id}-p${String(pageNumber).padStart(5, "0")}`;
        const imagePath = path.join(outputRoot, "pages", `${pageBase}.png`);
        const textPath = path.join(outputRoot, "text", `${pageBase}.txt`);

        if (!force && fs.existsSync(textPath)) {
          const text = fs.readFileSync(textPath, "utf8");
          const qualityPath = path.join(outputRoot, "quality", `${pageBase}.json`);
          let quality = null;
          if (fs.existsSync(qualityPath)) {
            try {
              quality = JSON.parse(fs.readFileSync(qualityPath, "utf8").replace(/^\\uFEFF/, ""));
            } catch {
              quality = null;
            }
          }
          pageRecords.push({
            page: pageNumber,
            status: "cached",
            imagePath,
            textPath,
            textChars: text.length,
            confidence: Number.isFinite(Number(quality?.confidence)) ? Number(quality.confidence) : undefined,
          });
          cachedPages += 1;
          continue;
        }

        if (newPagesForDocument >= newPageTarget) break;
        if (maxTotalPages > 0 && newlyProcessedPages >= maxTotalPages) break;

        const screenshot = await parser.getScreenshot({
          partial: [pageNumber],
          desiredWidth: 1800,
          imageDataUrl: false,
          imageBuffer: true,
        });

        const image = screenshot?.pages?.[0]?.data;
        if (!image) {
          pageRecords.push({ page: pageNumber, status: "render-error", reason: "No screenshot buffer returned" });
          continue;
        }

        const imageBuffer = Buffer.from(image);
        fs.writeFileSync(imagePath, imageBuffer);

        const result = await worker.recognize(imageBuffer);
        process.stdout.write("\r                    \r");
        const text = String(result?.data?.text || "").trim();
        const confidence = Number(result?.data?.confidence || 0);
        fs.writeFileSync(textPath, text, "utf8");
        fs.writeFileSync(
          path.join(outputRoot, "quality", `${pageBase}.json`),
          JSON.stringify({
            id: source.id,
            filename: source.filename,
            sourcePath: source.sourcePath,
            page: pageNumber,
            pageBase,
            measuredAt: new Date().toISOString(),
            renderWidth: 1800,
            languages,
            textChars: text.length,
            confidence,
            status: text ? "ocr-extracted" : "ocr-empty",
          }, null, 2),
          "utf8",
        );

        pageRecords.push({
          page: pageNumber,
          status: text ? "ocr-extracted" : "ocr-empty",
          imagePath: imagePath.replaceAll("\\", "/"),
          textPath: textPath.replaceAll("\\", "/"),
          textChars: text.length,
          confidence,
        });

        newlyProcessedPages += 1;
        newPagesForDocument += 1;
        totalPageBudgetUsed = newlyProcessedPages + cachedPages;
        console.log(`  page ${pageNumber}/${totalPages}: ${text.length} chars · confidence ${confidence.toFixed(1)}`);
      }

      const combined = pageRecords
        .filter((page) => page.textPath && fs.existsSync(page.textPath))
        .map((page) => `--- PAGE ${page.page} ---\n${fs.readFileSync(page.textPath, "utf8")}`)
        .join("\n\n");

      const combinedPath = path.join(outputRoot, "text", `${source.id}.txt`);
      fs.writeFileSync(combinedPath, combined, "utf8");

      records.push({
        id: source.id,
        filename: source.filename,
        sourcePath: source.sourcePath,
        status: "ocr-complete",
        totalPages,
        pagesProcessed: pageRecords.length,
        newlyProcessedPages: newPagesForDocument,
        completeDocument: pageRecords.filter((page) => page.textPath && fs.existsSync(page.textPath)).length >= totalPages,
        combinedTextPath: combinedPath.replaceAll("\\", "/"),
        textChars: combined.length,
        pages: pageRecords,
      });
    } catch (error) {
      records.push({
        id: source.id,
        filename: source.filename,
        sourcePath: source.sourcePath,
        status: "ocr-error",
        reason: error?.message || String(error),
      });
      console.log(`  OCR error: ${error?.message || String(error)}`);
    } finally {
      await parser.destroy();
    }
  }
} finally {
  await worker.terminate();
}

const output = {
  version: 1,
  generatedAt: new Date().toISOString(),
  languages,
  queuedDocuments: queued.length,
  processedDocuments: records.length,
  fullRun: processAll,
  summary: {
    ...records.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {}),
    newlyProcessedPages,
    cachedPages,
    totalPageBudgetUsed: newlyProcessedPages + cachedPages,
  },
  records,
};

fs.writeFileSync(path.join(outputRoot, "ocr-report.json"), JSON.stringify(output, null, 2), "utf8");
fs.writeFileSync("public/arcanum/ocr-report.json", JSON.stringify(output, null, 2), "utf8");

console.log("\nOCR run complete.");
console.log(JSON.stringify(output.summary, null, 2));
console.log("Wrote public/arcanum/ocr-report.json");
