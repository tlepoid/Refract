# Issue #49: A-01: Author 6 pattern library YAML files

https://github.com/tlepoid/Refract/issues/49

---

## Context
The pattern library is the structured knowledge that the AI reasons over and the eval engine scores against. These are not documentation — they are machine-readable data.

## Task
Create 6 YAML files in `packages/shared/patterns/`, one per pattern:

1. **react.yaml** — ReAct (Reasoning + Acting)
2. **plan-execute.yaml** — Plan-and-Execute
3. **multi-agent-chat.yaml** — Multi-agent group chat
4. **handoff.yaml** — Handoff orchestration
5. **routing.yaml** — Semantic/rule-based routing
6. **reflection.yaml** — Self-reflection loop

Each file must follow this exact schema:
```yaml
id: react
name: ReAct
category: orchestration  # orchestration | reasoning | memory | safety
description: |
  2 paragraphs describing the pattern
when_to_use:
  - Dynamic tasks where the solution path is not predictable
  - Tasks requiring exploration and adaptation
when_not_to_use:
  - Predictable workflows with known steps
  - Cost-sensitive applications
trade_offs:
  token_cost: high       # low | medium | high | variable
  latency: high
  reliability: medium
  complexity: medium
  adaptability: high
failure_modes:
  - Infinite reasoning loops without convergence
  - Excessive token consumption on simple tasks
compatible_with:
  - reflection
  - routing
conflicts_with:
  - plan-execute
example_graph:
  nodes: [...]           # minimal GraphNode[] demonstrating the pattern
  edges: [...]           # minimal GraphEdge[]
eval_profile:
  tokens_per_step: [200, 800, 2000]    # [min, median, max]
  steps_per_task: [3, 7, 20]
  p50_latency_ms: 3500
  p99_latency_ms: 15000
  failure_rate: 0.08
```

## Acceptance criteria
- [ ] All 6 files pass YAML lint (`yamllint`)
- [ ] All files conform to the schema (validate with a JSON schema or test)
- [ ] eval_profile numbers are realistic (based on published benchmarks and the technical plan's pattern comparison table)
- [ ] example_graph uses valid GraphNode/GraphEdge types from shared
- [ ] Each pattern has at least 3 when_to_use, 2 when_not_to_use, and 2 failure_modes

## Dependencies
- Blocked by: #2 (shared types — for example_graph node/edge types)
