import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from '../stores/graphStore';
import { NodeType, EdgeType } from '@refract/shared';
import type { GraphNode, GraphEdge } from '@refract/shared';

function makeNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: crypto.randomUUID(),
    type: NodeType.LLM,
    label: 'Test Node',
    position: { x: 0, y: 0 },
    config: {},
    pattern_id: null,
    metadata: {},
    ...overrides,
  };
}

function makeEdge(source: string, target: string, overrides: Partial<GraphEdge> = {}): GraphEdge {
  return {
    id: crypto.randomUUID(),
    source,
    target,
    source_handle: 'response',
    target_handle: 'prompt',
    type: EdgeType.DATA_FLOW,
    label: null,
    ...overrides,
  };
}

describe('graphStore', () => {
  beforeEach(() => {
    useGraphStore.setState({
      nodes: [],
      edges: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  });

  describe('addNode', () => {
    it('adds a node to the store', () => {
      const node = makeNode({ id: 'n1' });
      useGraphStore.getState().addNode(node);
      expect(useGraphStore.getState().nodes).toHaveLength(1);
      expect(useGraphStore.getState().nodes[0].id).toBe('n1');
    });
  });

  describe('removeNode', () => {
    it('removes the node and its connected edges', () => {
      const n1 = makeNode({ id: 'n1' });
      const n2 = makeNode({ id: 'n2' });
      const edge = makeEdge('n1', 'n2', { id: 'e1' });

      const store = useGraphStore.getState();
      store.addNode(n1);
      store.addNode(n2);
      store.addEdge(edge);
      store.setSelectedNodes(['n1']);

      useGraphStore.getState().removeNode('n1');

      const state = useGraphStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.nodes[0].id).toBe('n2');
      expect(state.edges).toHaveLength(0);
      expect(state.selectedNodeIds).not.toContain('n1');
    });
  });

  describe('duplicateSelected', () => {
    it('duplicates selected nodes with new IDs and remaps edges', () => {
      const n1 = makeNode({ id: 'n1' });
      const n2 = makeNode({ id: 'n2' });
      const n3 = makeNode({ id: 'n3' }); // not selected
      const internalEdge = makeEdge('n1', 'n2', { id: 'e-internal' });
      const externalEdge = makeEdge('n1', 'n3', { id: 'e-external' });

      const store = useGraphStore.getState();
      store.addNode(n1);
      store.addNode(n2);
      store.addNode(n3);
      store.addEdge(internalEdge);
      store.addEdge(externalEdge);
      store.setSelectedNodes(['n1', 'n2']);

      const { nodeIdMap } = useGraphStore.getState().duplicateSelected();

      const state = useGraphStore.getState();
      // Original 3 + 2 duplicated = 5
      expect(state.nodes).toHaveLength(5);
      // Original 2 + 1 internal duplicated = 3 (external edge not duplicated)
      expect(state.edges).toHaveLength(3);

      // New IDs are different from originals
      expect(nodeIdMap['n1']).not.toBe('n1');
      expect(nodeIdMap['n2']).not.toBe('n2');

      // Internal edge was remapped
      const newEdge = state.edges.find(
        (e) => e.id !== 'e-internal' && e.id !== 'e-external',
      )!;
      expect(newEdge.source).toBe(nodeIdMap['n1']);
      expect(newEdge.target).toBe(nodeIdMap['n2']);

      // Selection moved to new nodes
      expect(state.selectedNodeIds).toContain(nodeIdMap['n1']);
      expect(state.selectedNodeIds).toContain(nodeIdMap['n2']);
    });
  });

  describe('getGraphSnapshot', () => {
    it('returns a deep clone that is safe to mutate', () => {
      const node = makeNode({ id: 'n1', config: { model: 'claude' } });
      useGraphStore.getState().addNode(node);

      const snapshot = useGraphStore.getState().getGraphSnapshot();
      snapshot.nodes[0].config.model = 'gpt-4';

      // Original store should be unaffected
      expect(useGraphStore.getState().nodes[0].config.model).toBe('claude');
    });
  });

  describe('loadGraph', () => {
    it('replaces the entire graph and clears selection', () => {
      const store = useGraphStore.getState();
      store.addNode(makeNode({ id: 'old' }));
      store.setSelectedNodes(['old']);

      const newNodes = [makeNode({ id: 'new1' }), makeNode({ id: 'new2' })];
      useGraphStore.getState().loadGraph(newNodes, []);

      const state = useGraphStore.getState();
      expect(state.nodes).toHaveLength(2);
      expect(state.nodes[0].id).toBe('new1');
      expect(state.selectedNodeIds).toHaveLength(0);
    });
  });
});
