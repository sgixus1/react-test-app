# Arcanum Archive Source Ingestion

This pipeline is intentionally conservative. It prepares provenance and duplicate metadata before any text or image extraction.

## 1. Extract the source library

Extract the magic-library archive to a stable folder on Windows, for example:

```text
D:\Magic-Library
```

Do not rename files before the first scan. Original filenames are part of source provenance.

## 2. Scan the filesystem

From the repository root:

```powershell
npm run arcanum:scan -- -Root "D:\Magic-Library" -HashAll
```

This creates:

```text
import\source-files.json
```

The scanner records:

- relative path
- byte size
- SHA-256 hash
- modification time
- file extension

## 3. Build the source manifest

```powershell
npm run arcanum:import -- "import\source-files.json"
```

This writes:

```text
public\arcanum\source-manifest.json
public\arcanum\duplicate-report.json
```

## Duplicate rules

### Exact duplicate

Two files with the same SHA-256 hash.

### Likely duplicate

Two files with the same normalized filename stem and byte size.

Likely duplicates are never deleted automatically. They are only flagged for review because two editions can legitimately share similar names.

## Source kinds

The importer currently recognizes:

- PDF
- DOC / DOCX / RTF / TXT / Markdown
- image files
- EPUB / MOBI
- ZIP / RAR / 7Z
- other files

## What this pipeline does not do yet

It does not:

- OCR scanned documents
- translate source text
- extract page images
- classify magical claims as factual
- invent article text
- delete duplicate source files
- modify the original library

Those steps must happen in later reviewed phases.

## Planned next extraction stages

1. PDF text and page metadata
2. embedded image extraction
3. page-image generation for scanned PDFs
4. DOC/DOCX text extraction
5. archive unpacking for image collections such as magic circles
6. language detection
7. Chinese → English translation records
8. page-level provenance links
9. article publishing review

## Website integration

The Source Lab reads:

```text
public/arcanum/source-manifest.json
```

After the scanner and importer run, the Source Lab dashboard will automatically show:

- extracted file count
- image count
- document count
- duplicate sets
- file types
- relative source paths
- per-file import status
