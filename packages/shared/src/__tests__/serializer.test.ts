import { describe, it, expect } from 'vitest';
import { serializeGraphForLLM, identifyPatterns } from '../serializer.js';
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

function makeEdge(
  id: string,
  source: string,
  target: string,
  type = 'data_flow',
): GraphEdge {
  return {
    id,
    source,
    target,
    source_handle: 'output',
    target_handle: 'input',
    type,
    label: null,
  } as GraphEdge;
}

// ── serializeGraphForLLM ──

describe('serializeGraphForLLM', () => {
  it('strips position and metadata', () => {
    const nodes = [
      makeNode({ id: 'n1', type: 'llm', position: { x: 100, y: 200 }, metadata: { foo: 'bar' } }),
    ];
    const result = JSON.parse(serializeGraphForLLM(nodes, []));
    expect(result.nodes[0]).not.toHaveProperty('position');
    expect(result.nodes[0]).not.toHaveProperty('metadata');
    expect(result.nodes[0]).toHaveProperty('id', 'n1');
    expect(result.nodes[0]).toHaveProperty('type', 'llm');
  });

  it('keeps relevant edge fields', () => {
    const edges = [makeEdge('e1', 'n1', 'n2', 'data_flow')];
    const result = JSON.parse(serializeGraphForLLM([], edges));
    expect(result.edges[0]).toEqual({
      id: 'e1',
      source: 'n1',
      target: 'n2',
      type: 'data_flow',
    });
  });

  it('produces compact output under 2000 tokens for 10-node graph', () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      makeNode({ id: `n${i}`, type: 'llm', config: { model: 'claude-sonnet-4' } }),
    );
    const edges = Array.from({ length: 9 }, (_, i) =>
      makeEdge(`e${i}`, `n${i}`, `n${i + 1}`),
    );
    const serialized = serializeGraphForLLM(nodes, edges);
    // Rough token estimate: ~4 chars per token
    expect(serialized.length / 4).toBeLessThan(2000);
  });
});

// ── identifyPatterns ──

describe('identifyPatterns', () => {
  it('detects ReAct pattern (planner with react + tool cycle)', () => {
    const nodes = [
      makeNode({ id: 'p1', type: 'planner', config: { pattern: 'react', max_steps: 10 } }),
      makeNode({ id: 't1', type: 'tool' }),
    ];
    const edges = [
      makeEdge('e1', 'p1', 't1'),
      makeEdge('e2', 't1', 'p1'), // cycle
    ];
    const matches = identifyPatterns(nodes, edges);
    const react = matches.find((m) => m.patternId === 'react');
    expect(react).toBeDefined();
    expect(react!.confidence).toBe(1.0);
    expect(react!.involvedNodeIds).toContain('p1');
    expect(react!.involvedNodeIds).toContain('t1');
  });

  it('detects Plan-Execute pattern', () => {
    const nodes = [
      makeNode({ id: 'p1', type: 'planner', config: { pattern: 'plan-execute', max_steps: 5 } }),
      makeNode({ id: 't1', type: 'tool' }),
      makeNode({ id: 't2', type: 'tool' }),
    ];
    const edges = [
      makeEdge('e1', 'p1', 't1'),
      makeEdge('e2', 't1', 't2'),
    ];
    const matches = identifyPatterns(nodes, edges);
    const pe = matches.find((m) => m.patternId === 'plan-execute');
    expect(pe).toBeDefined();
    expect(pe!.confidence).toBe(1.0);
  });

  it('detects Multi-Agent Chat pattern', () => {
    const nodes = [
      makeNode({ id: 'r1', type: 'router' }),
      makeNode({ id: 'l1', type: 'llm' }),
      makeNode({ id: 'l2', type: 'llm' }),
    ];
    const edges = [
      makeEdge('e1', 'r1', 'l1'),
      makeEdge('e2', 'r1', 'l2'),
      makeEdge('e3', 'l1', 'r1'), // chat loop back
    ];
    const matches = identifyPatterns(nodes, edges);
    const mac = matches.find((m) => m.patternId === 'multi-agent-chat');
    expect(mac).toBeDefined();
    expect(mac!.confidence).toBe(1.0);
  });

  it('detects Handoff pattern (LLM → LLM with router)', () => {
    const nodes = [
      makeNode({ id: 'r1', type: 'router' }),
      makeNode({ id: 'l1', type: 'llm' }),
      makeNode({ id: 'l2', type: 'llm' }),
    ];
    const edges = [
      makeEdge('e1', 'r1', 'l1'),
      makeEdge('e2', 'l1', 'l2'), // handoff
    ];
    const matches = identifyPatterns(nodes, edges);
    const handoff = matches.find((m) => m.patternId === 'handoff');
    expect(handoff).toBeDefined();
    expect(handoff!.confidence).toBe(1.0);
  });

  it('detects Routing pattern (router with 2+ outgoing)', () => {
    const nodes = [
      makeNode({ id: 'r1', type: 'router' }),
      makeNode({ id: 'l1', type: 'llm' }),
      makeNode({ id: 'l2', type: 'llm' }),
    ];
    const edges = [
      makeEdge('e1', 'r1', 'l1'),
      makeEdge('e2', 'r1', 'l2'),
    ];
    const matches = identifyPatterns(nodes, edges);
    const routing = matches.find((m) => m.patternId === 'routing');
    expect(routing).toBeDefined();
    expect(routing!.confidence).toBe(1.0);
  });

  it('detects Reflection pattern (LLM → Guardrail → LLM cycle)', () => {
    const nodes = [
      makeNode({ id: 'l1', type: 'llm' }),
      makeNode({ id: 'g1', type: 'guardrail' }),
    ];
    const edges = [
      makeEdge('e1', 'l1', 'g1'),
      makeEdge('e2', 'g1', 'l1'), // reflection loop
    ];
    const matches = identifyPatterns(nodes, edges);
    const reflection = matches.find((m) => m.patternId === 'reflection');
    expect(reflection).toBeDefined();
    expect(reflection!.confidence).toBe(1.0);
  });

  it('returns empty array for no matching patterns', () => {
    const nodes = [
      makeNode({ id: 'i1', type: 'input' }),
      makeNode({ id: 'o1', type: 'output' }),
    ];
    const edges = [makeEdge('e1', 'i1', 'o1')];
    const matches = identifyPatterns(nodes, edges);
    expect(matches).toEqual([]);
  });
});
