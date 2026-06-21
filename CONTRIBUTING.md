# Contributing

## Setup

```bash
bun install
```

## Development

```bash
bun test           # Run tests
bun run typecheck  # TypeScript checks
bun run lint       # ESLint
bun run format     # Prettier
```

## Guidelines

- One class per file, PascalCase named exports
- No barrel files — import directly from source
- Tests co-located in `__tests__/` next to source
- Keep GEDCOM parser vendored — no npm deps for parsing
- Prefer `moduleResolution: "node16"` compatible imports
