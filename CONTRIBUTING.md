# Contributing to Refract

## Development Setup

```bash
git clone <repo>
pnpm install
docker-compose up -d   # PostgreSQL
cp .env.example .env   # Add ANTHROPIC_API_KEY
pnpm dev               # Starts app (3000) + server (4000)
```

## How to Add a New Node Type

1. **Add to the `NodeType` enum** in `packages/shared/src/index.ts`:
   ```ts
   export enum NodeType {
     // ...existing types
     MyNewNode = "my-new-node",
   }
   ```

2. **Create a config interface** for the node's configurable properties:
   ```ts
   export interface MyNewNodeConfig {
     label: string;
     // node-specific settings
   }
   ```

3. **Add handles in `NODE_HANDLES`** to define input/output connection points for the node.

4. **Create the node component** in `packages/app/src/components/canvas/nodes/`:
   ```
   packages/app/src/components/canvas/nodes/MyNewNode.tsx
   ```
   Implement the visual representation, config form, and handle placement.

5. **Register the node** in `nodeRegistry.ts` so the canvas and palette recognize it.

6. **Add a complexity weight** in `eval.ts` so the evaluation engine accounts for the new node type when scoring designs.

## How to Add a New Pattern

1. **Create a YAML file** in `packages/shared/patterns/`:
   ```yaml
   # packages/shared/patterns/my-pattern.yaml
   name: My Pattern
   description: Brief explanation of what this pattern does
   nodes:
     - type: llm
       role: coordinator
     - type: tool
       role: executor
   edges:
     - from: coordinator
       to: executor
   ```

2. **Add a detection function** in `serializer.ts` that inspects a graph and returns `true` when the pattern is present:
   ```ts
   function detectMyPattern(graph: SerializedGraph): boolean {
     // Check for the required node types and edge topology
   }
   ```

3. **Call the detector** in `identifyPatterns()` so it is included in the pattern identification pass.

## How to Add Eval Rules

Modify `evaluateGraph()` in `eval.ts`. The evaluation engine scores designs across four dimensions:

- **Cost** -- estimated token/API spend based on LLM node count and configuration
- **Latency** -- estimated end-to-end time based on sequential depth and node types
- **Reliability** -- presence of guardrails, retries, and fallback paths
- **Complexity** -- weighted node/edge count, cyclomatic complexity of the graph

Add or adjust scoring logic within the relevant dimension calculator.

## Testing

| Command         | What it runs                              |
| --------------- | ----------------------------------------- |
| `pnpm test`     | Unit tests (Vitest) across all packages   |
| `pnpm test:e2e` | End-to-end tests (Playwright) against app |

Write tests alongside your implementation. Unit tests live next to the source files or in a `__tests__` directory within the same package. E2E tests live in the project root under `tests/`.

## Pull Request Process

1. **Branch from `main`** -- use a descriptive branch name (e.g., `feat/my-new-node`, `fix/eval-latency-calc`).
2. **Write descriptive commits** -- explain the "why", not just the "what".
3. **All tests must pass** -- `pnpm test` and `pnpm lint` are required to be green before merge.
4. **Keep PRs focused** -- one feature or fix per PR. If a change touches multiple concerns, split it.
5. **Request review** -- at least one approval is required before merging.
