# GedcomGraph — TypeScript Port

## Status

**COMPLETE** — 1:1 port from `GedcomGraph/src/main/java/graph/gedcom/` (Java) → `src/graph/gedcom/` (TypeScript). 198/198 tests passing, typecheck clean, PNG renderer working.

## Ported Files (22 of 22 — COMPLETE)

Flat module subdirectories under `src/graph/gedcom/` (no barrel exports):

```
config/   Util.ts
core/     Metric.ts  Node.ts  Line.ts
model/    types.ts
nodes/    PersonNode.ts  FamilyNode.ts  Bond.ts
lines/    CurveLine.ts  VerticalLine.ts  HorizontalLine.ts
          NextLine.ts  BackLine.ts  DuplicateLine.ts
layout/   Group.ts  GroupRow.ts  Union.ts  UnionRow.ts  Genus.ts
engine/   Graph.ts  TreeWalker.ts  Animator.ts
vendor/   gedcom-parser/  (5 JS files, self-contained GEDCOM parser)
```

## Architecture

- **Graph.ts** — Public facade: config setters, getters, lifecycle (`initNodes`, `placeNodes`, `startFrom`), node factory methods (`createNodeFromPerson`, `createNodeFromFamily`, `createNextFamilyNode`), helpers (`getSpouses`, `areSiblings`, `checkForDuplicate`, `findAcquiredAncestry`)
- **TreeWalker.ts** — Tree-walking logic extracted from Graph. Receives Graph reference, walks GEDCOM relations from fulcrum: `walk()`, `findAncestors()`, `findAncestorGenus()`, `findUncles()`, `findHalfSiblings()`, `findDescendants()`, `findPersonGenus()`
- **Animator.ts** — Full layout engine: measures nodes, builds union rows, creates lines, resolves overlaps, computes final positions. Includes inner class `LineRow`.

## Conventions

- **File name**: PascalCase matching Java class name
- **Exports**: Named exports, one class per file
- **Types**: GEDCOM model interfaces in `model/types.ts`
- **Class fields**: Public by default (matches Java), no `public` keyword
- **Abstract methods**: `abstract methodName(): ReturnType`
- **Static methods on enums**: TS merged enum + namespace pattern
- **No getters/setters** — direct property access matches Java
- **Typecheck**: `npx tsc` — must pass before marking file done

## PNG Renderer

Modular renderer matching FamilyGem dark mode exactly. 6 files in `render/`:

| File             | Exports                                                                              | Description                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `colors.ts`      | 14 color constants                                                                   | `COLOR_BG`, `COLOR_BACK_ELEMENT`, `COLOR_MALE/FEMALE/UNDEFINED`, `COLOR_PARTNER`, `COLOR_TEXT/TEXT_VEILED`, `COLOR_LINES/HEARTH`, `COLOR_DEATH_RIBBON_*`, `COLOR_ACCENT/ACCENT_LIGHT` |
| `scale.ts`       | `initScale(s)`, `sf()`, `si()`, font/layout constants                                | Name 17sp bold, title 15sp italic, dates 14sp. Pad 6/5/6dp. Border 2dp, corners 3dp bg 4dp. Death ribbon 18dp.                                                                        |
| `measure.ts`     | `buildName`, `buildTitles`, `buildDates`, `isDead`, `measureNode`                    | Strips surnames (given name only). Titles from TITL tags. Dates with ★/✝/≈ symbols, multi-line.                                                                                       |
| `draw.ts`        | `drawPersonNodes`, `drawBonds`, `drawLines`, `drawDuplicateLines`, `drawDeathRibbon` | Death ribbon from exact `defunto.xml` vector. Fulcrum has no glow. Partner bg #66000000.                                                                                              |
| `gedcom-mock.ts` | `mapParsedGedcom`, `buildGedcom`                                                     | GEDCOM adapter implementing `types.ts` interfaces                                                                                                                                     |
| `RenderTree.ts`  | CLI entry                                                                            | `npx tsx render/RenderTree.ts <input.ged> <output.png> [scale] [personId]`                                                                                                            |

```bash
npm run render -- <input.ged> <output.png> [scale] [personId]
# scale defaults to 4 (HiDPI), personId defaults to first person
```

## Web App

Browser-based tree viewer using Vite + vanilla TypeScript + Panzoom. Hardcodes the Shankar Shirodkar family tree GEDCOM file.

| File                 | Purpose                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| `web/index.html`     | Dark-themed page with canvas element                                        |
| `web/main.ts`        | Entry — parses GEDCOM, runs graph pipeline, renders to canvas, Panzoom init |
| `web/style.css`      | Full-viewport dark container (`overflow: hidden`, Panzoom handles panning)  |
| `web/vite.config.ts` | Root: `web/`, outDir: `../dist`                                             |
| `web/shirodkar.ged`  | Hardcoded Shankar Shirodkar GEDCOM file                                     |
| `web/vite-env.d.ts`  | Vite client types + `?raw` module declaration                               |
| `web/tsconfig.json`  | Web-specific TS config (extends root, adds vite/client types)               |

```bash
bun dev       # Dev server with HMR at localhost:5173
bun run build # Production build → dist/
bun run deploy # Deploy to Vercel (requires Vercel CLI)
```

**Live:** https://shankarfamilytree.vercel.app

**Package manager:** Bun 1.3. Lockfile: `bun.lock` (no `package-lock.json`).

**Features:**

- Fulcrum: Rowlu Shet (`I113`). Scale: 2.
- **HiDPI rendering** — canvas pixel buffer = logical × `devicePixelRatio` (capped at 2). Crisp on Retina displays.
- **Panzoom** (`@panzoom/panzoom`) — mouse wheel zoom, click-drag pan, double-click zoom in.
- **Zoom-to-fit** — tree initially scaled to fill the viewport. `maxScale = dpr` ensures 1:1 pixel mapping at max zoom (never blurry).
- Same dark theme, fonts, and rendering as the PNG renderer.
- `web/vite.config.ts` at project root.

## Testing

```bash
node --import tsx --test src/**/__tests__/*.test.ts  # 198 tests
bun run typecheck                                     # npx tsc --noEmit
```

### Test files (14 files, 198 tests)

Tests are co-located in `__tests__/` subdirectories next to their source modules:

| File                                          | Tests | Description                                                                                                                                  |
| --------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `config/__tests__/Util.test.ts`               | 25    | Enum values (Card/Match/Branch/Side/Gender), Match.get/getForAncestors logic, Gender.getGender/isMale/isFemale, spacing constants, essence() |
| `engine/__tests__/graph.test.ts`              | 18    | Unit tests with mock GEDCOM data                                                                                                             |
| `engine/__tests__/config.test.ts`             | 11    | Config setters                                                                                                                               |
| `engine/__tests__/graph-api.test.ts`          | 14    | Graph getters                                                                                                                                |
| `engine/__tests__/animator-internals.test.ts` | 13    | Line type creation, distributeLines, biggestPathSize, bonds, union membership, multi-marriage NextLine/BackLine                              |
| `engine/__tests__/layout-geometry.test.ts`    | 12    | Node positions, generation spacing, Y ordering, no-overlap, spouse alignment, leftToRight                                                    |
| `engine/__tests__/complex-pedigrees.test.ts`  | 12    | Deep/wide trees, pedigree collapse, mini cards, aunt/uncle/cousins                                                                           |
| `engine/__tests__/semantics.test.ts`          | 13    | Edge cases: single-parent, half-siblings, step-families, multiple spouses, empty names                                                       |
| `engine/__tests__/shirodkar.test.ts`          | 1     | Shirodkar 26-person integration smoke test                                                                                                   |
| `engine/__tests__/real-trees.test.ts`         | 22    | Real GEDCOM trees: Shirodkar (8) + HP (9) + edge cases (4)                                                                                   |
| `nodes/__tests__/node-behavior.test.ts`       | 25    | PersonNode/FamilyNode/Bond behavior                                                                                                          |
| `nodes/__tests__/node-internals.test.ts`      | 12    | Card types, flags, generation, half-sibling, match enum                                                                                      |
| `lines/__tests__/lines.test.ts`               | 9     | All line types, grouping, finite coords                                                                                                      |
| `layout/__tests__/union-group.test.ts`        | 12    | Union/Group rows, linked lists, widths, overlap resolution                                                                                   |

### Bugs found writing real-tree tests

- `Graph.ts:278` — NPE in `checkForDuplicate` when `spouseFamily === null` (people without spouse families in HP tree)
- `types.ts:34` — `getChildren(gedcom: Gedcom)` → `getChildren(gedcom?: Gedcom)` to match mock's zero-param signature
- `shirodkar.test.ts:63` — `MFamily.getChildren()` returned `[...this._children]` spread copy, silently dropping all pushes
- `real-trees.test.ts` — `n.type === 'ANCESTRY'` string comparison against numeric `Card.ANCESTRY` enum. Fixed to `Card.ANCESTRY`
- `graph.test.ts` — duplicate detection test used wrong scenario (multi-marriage excludes fulcrum). Fixed with pedigree collapse scenario (shared grandfather)
