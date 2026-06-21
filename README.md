# GedcomGraph

TypeScript port of Michael's original Java GedcomGraph engine. Parses GEDCOM 5.5.1 files and lays out family trees as graphs — no genealogy app, just the layout algorithm and a renderer.

<img src="assets/sample.png" width="400"><img src="assets/sample-left.png" width="400" style="margin-left:12px">

## Usage

```bash
bun install
```

**CLI renderer:**

```bash
bun run render -- demo.ged tree.png [scale] [personId]
```

**Web app:**

```bash
bun dev       # localhost:5173
bun run build # dist/
```

**Tests:**

```bash
bun test              # 198 tests
bun run typecheck     # tsc --noEmit
```

## Library

```ts
const graph = new Graph()
graph.setGedcom(gedcom).maxAncestors(4).maxDescendants(4)
graph.startFrom(fulcrum)
// measure node sizes with a canvas context
graph.initNodes()
graph.placeNodes()
```

## Project layout

```
src/graph/gedcom/
  config/     Enums, constants, utilities
  core/       Metric, Node, Line base classes
  model/      GEDCOM interfaces (Person, Family, etc.)
  nodes/      PersonNode, FamilyNode, Bond
  lines/      6 line types for connections
  layout/     Group, Union, Genus layout primitives
  engine/     Graph facade, TreeWalker, Animator
render/       PNG renderer (colors, scale, draw)
web/          Vite + Panzoom browser viewer
```

Two runtime deps: `canvas` (PNG output) and `@panzoom/panzoom` (web). GEDCOM parser is vendored.

## Pipeline

```
GEDCOM → Parser → Graph.startFrom(fulcrum)
  → [measure] → initNodes() → placeNodes() → render
```

## Credits

Original Java implementation by Michael. This is a 1:1 TypeScript port.

## License

ISC
