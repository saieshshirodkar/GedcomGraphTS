# GedcomGraph TypeScript

TypeScript port of the GedcomGraph family tree layout engine. Parses [GEDCOM 5.5.1](https://gedcom.io/specifications/ged551.pdf) files and renders interactive family tree diagrams.

## Features

- **Fulcrum-based layout** — center on any person, walk ancestors/descendants
- **Multi-marriage support** — NEAR/MIDDLE/FAR spacing for multiple spouses
- **Duplicates** — handles pedigree collapse (cousin marriages)
- **Mini cards** — ancestry count / progeny count cards
- **PNG renderer** — headless Java2D-style output (default 4× HiDPI)
- **Web app** — Vite + Panzoom viewer with dark theme

## Install

```bash
bun install
```

Only two runtime deps: `canvas` (PNG rendering) and `@panzoom/panzoom` (web viewer). GEDCOM parser is vendored — zero npm deps for parsing.

## Usage

### Library

```ts
import { Graph } from './src/graph/gedcom/engine/Graph'
import { Parser } from './src/vendor/gedcom-parser/index'
import { mapParsedGedcom, buildGedcom } from './render/gedcom-mock'
import { measureNode } from './render/measure'
import { initScale } from './render/scale'

initScale(4)

const raw = fs.readFileSync('tree.ged', 'utf-8')
const records = Parser.parse(raw)
const { people, families } = mapParsedGedcom(records)
const gedcom = buildGedcom(people, families)

const graph = new Graph()
graph.setGedcom(gedcom).maxAncestors(4).maxDescendants(4)

const fulcrum = gedcom.getPerson('I1')
if (!fulcrum) throw new Error('Fulcrum not found')

graph.startFrom(fulcrum)
// Measure node sizes (requires a canvas context)
// const ctx = createCanvas(1000, 100).getContext('2d')
// graph.getPersonNodes().forEach(pn => measureNode(pn, ctx))

graph.initNodes()
if (graph.needMaxBitmapSize()) graph.setMaxBitmapSize(1000)
graph.placeNodes()

console.log(`Tree: ${graph.getWidth()}×${graph.getHeight()}`)
```

### CLI (PNG Renderer)

```bash
bun run render -- input.ged output.png [scale] [personId]
# scale defaults to 4 (HiDPI), personId defaults to first person
```

### Web App

```bash
bun dev        # HMR at localhost:5173
bun run build  # Production → dist/
```

## Architecture

```
GEDCOM → Parser → Gedcom → Graph.startFrom(fulcrum)
  → [measure node sizes] → Graph.initNodes()
  → Graph.placeNodes() → render
```

| Directory                   | Contents                                    |
| --------------------------- | ------------------------------------------- |
| `src/graph/gedcom/config/`  | Enums, constants, utility functions         |
| `src/graph/gedcom/core/`    | Base classes: `Metric`, `Node`, `Line`      |
| `src/graph/gedcom/model/`   | GEDCOM data interfaces                      |
| `src/graph/gedcom/nodes/`   | `PersonNode`, `FamilyNode`, `Bond`          |
| `src/graph/gedcom/lines/`   | 6 line types (CurveLine, BackLine, etc.)    |
| `src/graph/gedcom/layout/`  | Group, Union, Genus layout primitives       |
| `src/graph/gedcom/engine/`  | `Graph`, `TreeWalker`, `Animator`           |
| `src/vendor/gedcom-parser/` | Self-contained GEDCOM 5.5.1 parser          |
| `render/`                   | PNG renderer (colors, scale, measure, draw) |
| `web/`                      | Vite web app                                |

## Commands

```bash
bun test           # 198 tests via Node native test runner
bun run typecheck  # npx tsc --noEmit
bun run render     # CLI PNG renderer
bun dev            # Web app dev server
bun run build      # Web app production build
bun run deploy     # Deploy to Vercel
```

## Dependencies

**Runtime:** `canvas`, `@panzoom/panzoom`  
**Dev:** `@types/node`, `tsx`, `typescript`, `vite`, `c8`

GEDCOM parsing is vendored — no external dependency.

## License

ISC — see [LICENSE](LICENSE).
