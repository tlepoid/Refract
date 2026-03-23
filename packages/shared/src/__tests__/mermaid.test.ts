import { describe, it, expect } from 'vitest';
import { graphToMermaid, mermaidToGraph } from '../mermaid';
import { NodeType, EdgeType, type GraphNode, type GraphEdge } from '../index';

function makeNode(overrides: Partial<GraphNode> & Pick<GraphNode, 'id' | 'type' | 'label'>): GraphNode {
  return {
    position: { x: 0, y: 0 },
    config: {},
    pattern_id: null,
    metadata: {},
    ...overrides,
  };
}

function makeEdge(overrides: Partial<GraphEdge> & Pick<GraphEdge, 'id' | 'source' | 'target' | 'type'>): GraphEdge {
  return {
    source_handle: 'output',
    target_handle: 'input',
    label: null,
    ...overrides,
  };
}

describe('graphToMermaid', () => {
  it('exports an empty graph as just the header', () => {
    const result = graphToMermaid([], []);
    expect(result).toBe('graph LR');
  });

  it('exports a graph with 2 nodes and 1 edge in correct Mermaid format', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'n1', type: NodeType.LLM, label: 'My LLM' }),
      makeNode({ id: 'n2', type: NodeType.TOOL, label: 'Search' }),
    ];
    const edges: GraphEdge[] = [
      makeEdge({ id: 'e1', source: 'n1', target: 'n2', type: EdgeType.TOOL_CALL }),
    ];

    const result = graphToMermaid(nodes, edges);

    expect(result).toContain('graph LR');
    expect(result).toContain('n1["My LLM (llm)"]');
    expect(result).toContain('n2["Search (tool)"]');
    expect(result).toContain('n1 -->|tool_call| n2');
    expect(result).toContain('classDef llm fill:');
    expect(result).toContain('classDef tool fill:');
    expect(result).toContain('class n1 llm');
    expect(result).toContain('class n2 tool');
  });
});

describe('mermaidToGraph', () => {
  it('round-trips nodes and edges: count and types match', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'a', type: NodeType.INPUT, label: 'Start' }),
      makeNode({ id: 'b', type: NodeType.ROUTER, label: 'Route' }),
      makeNode({ id: 'c', type: NodeType.OUTPUT, label: 'End' }),
    ];
    const edges: GraphEdge[] = [
      makeEdge({ id: 'e1', source: 'a', target: 'b', type: EdgeType.DATA_FLOW }),
      makeEdge({ id: 'e2', source: 'b', target: 'c', type: EdgeType.CONTROL_FLOW }),
    ];

    const mermaid = graphToMermaid(nodes, edges);
    const result = mermaidToGraph(mermaid);

    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);

    expect(result.nodes[0].type).toBe(NodeType.INPUT);
    expect(result.nodes[0].label).toBe('Start');

    expect(result.nodes[1].type).toBe(NodeType.ROUTER);
    expect(result.nodes[1].label).toBe('Route');

    expect(result.nodes[2].type).toBe(NodeType.OUTPUT);
    expect(result.nodes[2].label).toBe('End');
  });

  it('handles unknown node types by defaulting to LLM', () => {
    const mermaid = `graph LR
  unknownNode["Widget (foobar)"]`;

    const result = mermaidToGraph(mermaid);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe(NodeType.LLM);
    expect(result.nodes[0].label).toBe('Widget');
  });

  it('preserves edge types in round-trip', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'x', type: NodeType.LLM, label: 'LLM' }),
      makeNode({ id: 'y', type: NodeType.MEMORY, label: 'Mem' }),
    ];
    const edges: GraphEdge[] = [
      makeEdge({ id: 'e1', source: 'x', target: 'y', type: EdgeType.MEMORY_OP }),
    ];

    const mermaid = graphToMermaid(nodes, edges);
    const result = mermaidToGraph(mermaid);

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].type).toBe(EdgeType.MEMORY_OP);
    expect(result.edges[0].source).toBe('x');
    expect(result.edges[0].target).toBe('y');
  });
});
