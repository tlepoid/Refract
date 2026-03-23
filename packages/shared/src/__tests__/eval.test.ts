import { describe, it, expect } from 'vitest';
import { evaluateGraph } from '../eval.js';
import type { GraphNode, GraphEdge } from '../index.js';

function makeNode(overrides: Partial<GraphNode> & { id: string; type: string }): GraphNode {
  return {
    label: overrides.id,
    position: { x: 0, y: 0 },
    config: {},
    pattern_id: null,
    metadata: {},
    ...overrides,
  } as GraphNode;
}

function makeEdge(id: string, source: string, target: string): GraphEdge {
  return {
    id,
    source,
    target,
    source_handle: 'output',
    target_handle: 'input',
    type: 'data_flow',
    label: null,
  } as GraphEdge;
}

const emptyProfiles = new Map();

const reactProfile = {
  tokens_per_step: [200, 800, 2000] as [number, number, number],
  steps_per_task: [3, 7, 20] as [number, number, number],
  p50_latency_ms: 3500,
  p99_latency_ms: 15000,
  failure_rate: 0.08,
};

describe('evaluateGraph', () => {
  it('returns zeroes for empty graph', () => {
    const result = evaluateGraph([], [], emptyProfiles);
    expect(result.cost.min).toBe(0);
    expect(result.cost.median).toBe(0);
    expect(result.cost.max).toBe(0);
    expect(result.cost.currency).toBe('USD');
    expect(result.latency_p50_ms).toBe(0);
    expect(result.latency_p99_ms).toBe(0);
    expect(result.reliability).toBe(1);
    expect(result.complexity).toBe(0);
  });

  it('computes cost for a single LLM node', () => {
    const nodes = [
      makeNode({ id: 'l1', type: 'llm', config: { model: 'claude-sonnet-4' } }),
    ];
    const result = evaluateGraph(nodes, [], emptyProfiles);
    expect(result.cost.median).toBeGreaterThan(0);
    expect(result.complexity).toBe(2); // llm weight
  });

  it('computes complexity for a serial 3-node chain', () => {
    const nodes = [
      makeNode({ id: 'i', type: 'input' }),
      makeNode({ id: 'l1', type: 'llm' }),
      makeNode({ id: 'o', type: 'output' }),
    ];
    const edges = [makeEdge('e1', 'i', 'l1'), makeEdge('e2', 'l1', 'o')];
    const result = evaluateGraph(nodes, edges, emptyProfiles);
    expect(result.complexity).toBe(2); // input=0, llm=2, output=0
  });

  it('computes latency for serial path with pattern profiles', () => {
    const profiles = new Map([['react', reactProfile]]);
    const nodes = [
      makeNode({ id: 'i', type: 'input' }),
      makeNode({ id: 'p1', type: 'planner', pattern_id: 'react' }),
      makeNode({ id: 'o', type: 'output' }),
    ];
    const edges = [makeEdge('e1', 'i', 'p1'), makeEdge('e2', 'p1', 'o')];
    const result = evaluateGraph(nodes, edges, profiles);
    expect(result.latency_p50_ms).toBe(3500);
    expect(result.latency_p99_ms).toBe(15000);
  });

  it('computes reliability as compound probability', () => {
    const nodes = [
      makeNode({ id: 'l1', type: 'llm' }),
      makeNode({ id: 'l2', type: 'llm' }),
    ];
    const result = evaluateGraph(nodes, [], emptyProfiles);
    // Default failure_rate is 0.02 each, so reliability = (1-0.02)^2
    expect(result.reliability).toBeCloseTo(0.98 * 0.98, 3);
  });

  it('handles a ReAct loop graph', () => {
    const profiles = new Map([['react', reactProfile]]);
    const nodes = [
      makeNode({ id: 'i', type: 'input' }),
      makeNode({ id: 'p1', type: 'planner', pattern_id: 'react', config: { pattern: 'react' } }),
      makeNode({ id: 't1', type: 'tool' }),
      makeNode({ id: 'o', type: 'output' }),
    ];
    const edges = [
      makeEdge('e1', 'i', 'p1'),
      makeEdge('e2', 'p1', 't1'),
      makeEdge('e3', 't1', 'p1'), // cycle
      makeEdge('e4', 'p1', 'o'),
    ];
    const result = evaluateGraph(nodes, edges, profiles);
    expect(result.cost.median).toBeGreaterThan(0);
    expect(result.reliability).toBeLessThan(1);
    expect(result.complexity).toBe(4); // planner=3, tool=1
  });

  it('handles disconnected subgraph', () => {
    const nodes = [
      makeNode({ id: 'l1', type: 'llm' }),
      makeNode({ id: 'l2', type: 'llm' }),
    ];
    // No edges — disconnected
    const result = evaluateGraph(nodes, [], emptyProfiles);
    expect(result.complexity).toBe(4); // 2 LLMs
    expect(result.cost.median).toBeGreaterThan(0);
  });

  it('returns realistic USD cost ranges', () => {
    const profiles = new Map([['react', reactProfile]]);
    const nodes = [
      makeNode({ id: 'p1', type: 'planner', pattern_id: 'react', config: { model: 'claude-sonnet-4' } }),
    ];
    const result = evaluateGraph(nodes, [], profiles);
    // Median: 800 tokens * 7 steps = 5600 tokens, at ~$10.2/M = ~$0.057
    expect(result.cost.median).toBeGreaterThan(0.001);
    expect(result.cost.median).toBeLessThan(1);
  });
});
