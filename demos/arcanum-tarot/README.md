# Arcanum Tarot — Standalone Rule-Based Demo

This folder is intentionally isolated from the main Arcanum Archive application.

## Run it

No install, npm command, server, API key, or build step is required.

On Windows, after pulling the branch, open:

```text
C:\Users\Admin\Arcanum-Archive\demos\arcanum-tarot\index.html
```

You can double-click `index.html` or run:

```powershell
Start-Process .\demos\arcanum-tarot\index.html
```

## Included

- Complete 78-card deck: 22 Major Arcana + 56 Minor Arcana
- Upright and reversed meanings for every card
- Original procedural SVG illustration for every card face
- Major Arcana symbolic scene treatment
- Numbered pip layouts and court-card treatments for the Minor Arcana
- Seeded Fisher–Yates shuffle
- No duplicate cards within a reading
- Adjustable reversal rate
- One Card
- Past / Present / Future
- Love / Relationship
- Career
- Decision
- Celtic Cross
- Position-aware interpretation
- Question-domain modifiers
- Neighboring-card elemental interactions
- Same-suit reinforcement
- Repeated-rank/archetype detection
- Major/Minor weighting
- Reversal weighting
- Element and suit dominance
- Court-card pattern detection
- Expandable interpretation-engine trace
- Stable daily card
- Browser-local reading history
- Responsive layout
- No AI/API-generated answer text

## Interpretation principle

The card draw is random. The interpretation text is deterministic.

For the same seed, spread, and reversal configuration, the same cards and orientations are produced. The reading is assembled from fixed rules:

```text
card meaning
+ upright/reversed orientation
+ spread position
+ reading domain
+ neighboring elemental relationship
+ same-suit reinforcement
+ repeated rank/archetype
+ whole-spread Major/Minor balance
+ reversal balance
+ dominant suit/element
= reading
```

The **Why did the engine say this?** panel exposes the rules used for each card.

## Built-in self-checks

The page tests itself when opened:

1. Exactly 78 cards
2. Unique card IDs
3. Upright and reversed meanings present
4. Seeded shuffle is deterministic
5. Different seeds produce different order
6. Celtic Cross has no duplicate draw
7. Spread sizes match their definitions
8. 0% reversal yields upright cards
9. 100% reversal yields reversed cards
10. Interpretation engine emits rule trace

The top-right badge should read:

```text
Engine self-checks: PASS
```

## Scope

This is a playable trial implementation. Its card art is an original vector illustration system generated locally in the browser; it does not copy a commercial tarot deck. A later production pass can replace those SVG faces with a fully painted custom Arcanum Archive deck without changing the tarot engine.

Tarot is presented as a reflective / entertainment experience, not guaranteed prediction.
