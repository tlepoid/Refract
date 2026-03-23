# Issue #35: S-01: Scaffold monorepo with pnpm workspaces

https://github.com/tlepoid/Refract/issues/35

---

## Context
This is the first task in the entire project. Every other agent depends on this landing cleanly.

## Task
Scaffold a monorepo with three packages:
- `packages/app` — Next.js 15 (App Router) + TypeScript + Tailwind v4
- `packages/server` — Express.js + TypeScript
- `packages/shared` — Shared TypeScript types (no runtime deps)

Set up:
- pnpm workspaces (`pnpm-workspace.yaml`)
- Root `tsconfig.json` with project references
- `.gitignore`, `.nvmrc` (Node 20), `.prettierrc`
- Basic `docker-compose.yml` with PostgreSQL 16

## Acceptance criteria
- [ ] `pnpm install` succeeds from root
- [ ] `pnpm --filter app dev` starts Next.js on localhost:3000
- [ ] `pnpm --filter server dev` starts Express on localhost:4000
- [ ] Importing from `@refract/shared` works in both app and server
- [ ] Docker compose brings up PostgreSQL

## Files to create
```
pnpm-workspace.yaml
tsconfig.json
docker-compose.yml
packages/app/package.json
packages/app/tsconfig.json
packages/app/src/app/page.tsx
packages/app/src/app/layout.tsx
packages/app/tailwind.config.ts
packages/server/package.json
packages/server/tsconfig.json
packages/server/src/index.ts
packages/shared/package.json
packages/shared/tsconfig.json
packages/shared/src/index.ts
```

## Agent instructions
This issue blocks ALL other work. Ship it fast, keep it minimal. Do not add any UI beyond a blank page. Do not install ReactFlow, Yjs, or any other dependency — those belong to other agents.
