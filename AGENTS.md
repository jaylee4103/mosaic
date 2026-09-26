<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Monorepo Structure

This is a Bun workspaces monorepo. The root `package.json` defines workspaces and shared scripts.

```
mosaic/
├── apps/
│   ├── web/                  # Next.js 16 frontend (TypeScript, App Router)
│   │   ├── app/              # Routes (layout.tsx, page.tsx, etc.)
│   │   ├── components/       # shadcn/ui components (Base UI + Tailwind 4)
│   │   │   └── ui/           # button, card, input, label
│   │   ├── lib/              # Utilities (cn, etc.)
│   │   ├── public/           # Static assets
│   │   ├── components.json   # shadcn config
│   │   ├── eslint.config.mjs # ESLint flat config
│   │   ├── next.config.ts    # Next.js config
│   │   ├── postcss.config.mjs
│   │   ├── package.json      # @mosaic/web
│   │   └── tsconfig.json
│   └── ml/                   # Python ML service (FastAPI)
│       ├── app/
│       │   ├── main.py       # FastAPI entrypoint
│       │   ├── routes/
│       │   │   └── vibe.py   # POST /api/vibe/analyze
│       │   ├── models/       # Pydantic schemas (facets, vibe)
│       │   └── services/     # embedding, jev, aggregation
│       ├── pyproject.toml    # @mosaic/ml
│       └── requirements.txt
├── packages/
│   └── shared/               # Shared types/utils (@mosaic/shared)
│       └── src/
├── .spec/                    # Architecture specs & design docs
│   └── vibe-detection-system.md
├── vercel.json               # rootDirectory: apps/web
├── AGENTS.md                 # This file
└── .gitignore
```

### Key Paths

| What | Path |
|---|---|
| Frontend app | `apps/web/` |
| ML service | `apps/ml/` |
| Shared code | `packages/shared/` |
| Design specs | `.spec/` |
| Vercel config | `vercel.json` |
| Root package.json | `package.json` (workspaces: `apps/*`, `packages/*`) |

## Branch Creation Instructions

When creating a new branch, use the following naming convention:

```
vyang/<conventional-commit-type>-<short-description>
```

Examples:
- `vyang/feat-add-authentication`
- `vyang/fix-login-redirect`
- `vyang/chore-update-dependencies`
- `vyang/docs-update-readme`

The conventional commit types are: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`.
