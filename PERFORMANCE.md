# Performance Profiling

## Methodology

Performance benchmarks are run as part of the Playwright E2E test suite. Tests measure real browser performance with the full React + ReactFlow rendering pipeline.

### Test Environment
- Browser: Chromium (headless)
- Framework: Playwright Test
- Rendering: React 19 + ReactFlow 12.x + Zustand

## Benchmarks

### Canvas Rendering (50 nodes, 80 edges)

| Metric | Threshold | Description |
|--------|-----------|-------------|
| FPS during pan | >= 20 fps | Average frames per second while panning a 50-node canvas |
| Node addition | < 10ms | Average time to add a single node via Zustand store |
| Graph serialization | < 50ms | Time to serialize a 50-node graph to JSON |

### Evaluation Engine

| Metric | Threshold | Description |
|--------|-----------|-------------|
| `evaluateGraph()` | < 50ms | Scorecard computation for a 50-node, 80-edge graph |
| `identifyPatterns()` | < 20ms | Pattern detection across 6 pattern types |
| `graphToMermaid()` | < 10ms | Mermaid export for 50-node graph |

### Collaboration (Yjs)

| Metric | Threshold | Description |
|--------|-----------|-------------|
| Node sync latency | < 100ms | Time for a node added in Context A to appear in Context B |
| Awareness update | < 50ms | Time for cursor position to propagate between peers |

## Running Benchmarks

```bash
# Run all performance tests
pnpm test:e2e -- --grep "Performance"

# Run with verbose output
pnpm test:e2e -- --grep "Performance" --reporter=list
```

## Thresholds

Thresholds are intentionally set conservatively to account for CI environment variability:
- **FPS**: 20 fps minimum (real-world target: 60 fps)
- **Eval time**: 50ms maximum (real-world target: 10ms)
- **Sync latency**: 100ms maximum (real-world target: 30ms)

## Architecture Considerations

- **ReactFlow virtualization**: Only visible nodes are rendered in the DOM, enabling performance at scale
- **Zustand selectors**: Fine-grained subscriptions prevent unnecessary re-renders
- **Yjs CRDT**: Binary diff protocol minimizes network overhead for collaboration
- **Debounced updates**: Property panel inputs use 300ms debounce to batch state updates
