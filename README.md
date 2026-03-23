# Refract - AI Agent Design Workbench

A visual tool for designing, evaluating, and collaborating on AI agent architectures. Refract provides a drag-and-drop canvas for composing agent graphs, real-time multi-user collaboration, AI-powered analysis via Claude, and an evaluation scorecard that scores designs on cost, latency, reliability, and complexity.

## Key Features

- **Drag-and-drop node canvas** -- build agent architectures visually with ReactFlow
- **9 node types** -- LLM, Tool, Memory, Router, Planner, Guardrail, Human-in-Loop, Input, Output
- **4 edge types** -- connect nodes with typed relationships
- **Real-time collaboration** -- multiple users edit the same canvas simultaneously via Yjs CRDT
- **AI-powered analysis** -- send your design to Claude for architectural feedback
- **Eval scorecard** -- automatic scoring across cost, latency, reliability, and complexity dimensions
- **Pattern library** -- recognized patterns include ReAct, Plan-Execute, Reflection, Multi-Agent Chat, Handoff, and Routing
- **Undo/redo** -- collaborative undo via Yjs UndoManager with local snapshot fallback
- **Mermaid import/export** -- convert between visual canvas and Mermaid diagram syntax
- **What-if fork mode** -- branch a design to explore alternatives without affecting the original

## Tech Stack

| Layer    | Technology                                       |
| -------- | ------------------------------------------------ |
| Frontend | Next.js 15, React 19, ReactFlow, Zustand, Yjs   |
| Backend  | Express 5, PostgreSQL 16, Anthropic SDK          |
| Shared   | TypeScript types, eval engine, pattern detection  |
| Tooling  | pnpm workspaces, Playwright (E2E), Vitest (unit) |

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker (for PostgreSQL)
- Anthropic API key

## Getting Started

```bash
git clone <repo>
pnpm install
docker-compose up -d   # PostgreSQL
cp .env.example .env   # Add ANTHROPIC_API_KEY
pnpm dev               # Starts app (3000) + server (4000)
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
packages/
  app/       Next.js frontend -- canvas UI, state management, collaboration
  server/    Express backend -- REST API, WebSocket sync, AI analysis, persistence
  shared/    TypeScript types, graph evaluation, pattern detection, serialization
```

## Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `pnpm dev`      | Start app and server in development  |
| `pnpm build`    | Production build for all packages    |
| `pnpm test`     | Run unit tests                       |
| `pnpm test:e2e` | Run Playwright end-to-end tests      |
| `pnpm lint`     | Lint all packages                    |

## License

TBD
