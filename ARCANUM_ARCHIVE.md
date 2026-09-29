# The Arcanum Archive — Prototype v0.1

This branch contains the first substantial coded build of **The Arcanum Archive**, an interactive magic encyclopedia and digital grimoire experience.

## Current experience

- Cinematic animated home scene using generated SVG artwork
- Motion-rich arcane seals, particles, hover states, and parallax
- Searchable bilingual encyclopedia records
- Category filtering
- Dedicated record/detail views with source provenance
- Interactive image annotation prototype
- Guided **Learn Magic** section
- Interactive knowledge constellation
- Digital Library shelf view
- Digital manuscript reader concept with Original / English layers
- Responsive mobile layouts
- Reduced-motion switch
- Source-lock policy: untranslated or unread source content is never fabricated

## Source grounding

Initial records come from the uploaded `Magic_Library_Inventory.txt`.

The inventory reports:
- 20 split archive volumes
- 256 raw files
- Chinese and English source material
- obvious duplicate file pairs that should be deduplicated before full import

Original document text and imagery are **not yet extracted** into this branch. Generated SVG artwork is used only for the interface until source scans, diagrams, talismans, tarot imagery, symbols, and illustrations can be imported.

## Branch

`feature/arcanum-archive-v0.1`

The host repository's `main` branch is intentionally left unchanged.

## Run

```bash
npm install
npm run dev
```

## Production build

```bash
npm ci
npm run build
```

## Next build phases

1. Extract and deduplicate the source archive.
2. Import original images and page scans.
3. Build translation records with Chinese original + English reviewed text.
4. Add page-level source citations and OCR confidence.
5. Expand relationships between spells, rituals, traditions, symbols, entities, and artifacts.
6. Add full-text search and persistent bookmarks.
7. Deploy a preview once the content pipeline is stable.
