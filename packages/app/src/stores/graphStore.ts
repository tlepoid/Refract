import { create } from 'zustand';
import * as Y from 'yjs';
import type { GraphNode, GraphEdge } from '@refract/shared';

// ── State interfaces ──

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
}

export interface UIState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelTab: 'properties' | 'analysis' | 'eval' | 'patterns' | 'decisions';
  historyMode: boolean;
  forks: Record<string, { nodes: GraphNode[], edges: GraphEdge[] }>;
  activeForkId: string | null;
  mainBranchSnapshot: { nodes: GraphNode[], edges: GraphEdge[] } | null;
}

export interface GraphActions {
  // Yjs binding
  bindYjs: (
    nodes: Y.Map<Y.Map<unknown>>,
    edges: Y.Map<Y.Map<unknown>>,
    undoManager: Y.UndoManager,
  ) => () => void;

  // Node CRUD
  addNode: (node: GraphNode) => void;
  removeNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeConfig: (nodeId: string, field: string, value: unknown) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;

  // Edge CRUD
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (edgeId: string) => void;

  // Selection
  setSelectedNodes: (ids: string[]) => void;
  setSelectedEdges: (ids: string[]) => void;
  clearSelection: () => void;

  // Bulk
  removeSelected: () => void;
  duplicateSelected: () => { nodeIdMap: Record<string, string> };

  // Serialisation
  getGraphSnapshot: () => { nodes: GraphNode[]; edges: GraphEdge[] };
  loadGraph: (nodes: GraphNode[], edges: GraphEdge[]) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;

  // UI
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setRightPanelTab: (tab: UIState['rightPanelTab']) => void;
  setHistoryMode: (mode: boolean) => void;

  // Fork
  createFork: () => string;
  switchFork: (forkId: string | null) => void;
  deleteFork: (forkId: string) => void;
}

export type GraphStore = GraphState & UIState & GraphActions;

function generateId(): string {
  return crypto.randomUUID();
}

// ── Yjs helpers ──

function nodeToYMap(node: GraphNode): Y.Map<unknown> {
  const yNode = new Y.Map<unknown>();
  yNode.set('id', node.id);
  yNode.set('type', node.type);
  yNode.set('label', node.label);
  yNode.set('position_x', node.position.x);
  yNode.set('position_y', node.position.y);
  yNode.set('config', JSON.stringify(node.config));
  yNode.set('pattern_id', node.pattern_id);
  yNode.set('metadata', JSON.stringify(node.metadata));
  return yNode;
}

function yMapToNode(yNode: Y.Map<unknown>): GraphNode {
  return {
    id: yNode.get('id') as string,
    type: yNode.get('type') as GraphNode['type'],
    label: yNode.get('label') as string,
    position: {
      x: yNode.get('position_x') as number,
      y: yNode.get('position_y') as number,
    },
    config: JSON.parse((yNode.get('config') as string) || '{}'),
    pattern_id: (yNode.get('pattern_id') as string | null) ?? null,
    metadata: JSON.parse((yNode.get('metadata') as string) || '{}'),
  };
}

function edgeToYMap(edge: GraphEdge): Y.Map<unknown> {
  const yEdge = new Y.Map<unknown>();
  yEdge.set('id', edge.id);
  yEdge.set('source', edge.source);
  yEdge.set('target', edge.target);
  yEdge.set('source_handle', edge.source_handle);
  yEdge.set('target_handle', edge.target_handle);
  yEdge.set('type', edge.type);
  yEdge.set('label', edge.label);
  return yEdge;
}

function yMapToEdge(yEdge: Y.Map<unknown>): GraphEdge {
  return {
    id: yEdge.get('id') as string,
    source: yEdge.get('source') as string,
    target: yEdge.get('target') as string,
    source_handle: yEdge.get('source_handle') as string,
    target_handle: yEdge.get('target_handle') as string,
    type: yEdge.get('type') as GraphEdge['type'],
    label: (yEdge.get('label') as string | null) ?? null,
  };
}

function readAllNodes(yNodes: Y.Map<Y.Map<unknown>>): GraphNode[] {
  const result: GraphNode[] = [];
  yNodes.forEach((yNode) => result.push(yMapToNode(yNode)));
  return result;
}

function readAllEdges(yEdges: Y.Map<Y.Map<unknown>>): GraphEdge[] {
  const result: GraphEdge[] = [];
  yEdges.forEach((yEdge) => result.push(yMapToEdge(yEdge)));
  return result;
}

// ── Store refs (set by bindYjs) ──
let _yNodes: Y.Map<Y.Map<unknown>> | null = null;
let _yEdges: Y.Map<Y.Map<unknown>> | null = null;
let _undoManager: Y.UndoManager | null = null;

export const useGraphStore = create<GraphStore>()((set, get) => ({
  // ── Initial state ──
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  selectedEdgeIds: [],
  leftPanelOpen: true,
  rightPanelOpen: false,
  rightPanelTab: 'properties',
  historyMode: false,
  forks: {} as Record<string, { nodes: GraphNode[], edges: GraphEdge[] }>,
  activeForkId: null as string | null,
  mainBranchSnapshot: null as { nodes: GraphNode[], edges: GraphEdge[] } | null,

  // ── Yjs binding ──
  bindYjs: (nodes, edges, undoManager) => {
    _yNodes = nodes;
    _yEdges = edges;
    _undoManager = undoManager;

    // Initial sync
    set({
      nodes: readAllNodes(nodes),
      edges: readAllEdges(edges),
    });

    // Observe changes
    const nodesObserver = () => {
      set({ nodes: readAllNodes(nodes) });
    };
    const edgesObserver = () => {
      set({ edges: readAllEdges(edges) });
    };

    nodes.observeDeep(nodesObserver);
    edges.observeDeep(edgesObserver);

    return () => {
      nodes.unobserveDeep(nodesObserver);
      edges.unobserveDeep(edgesObserver);
      _yNodes = null;
      _yEdges = null;
      _undoManager = null;
    };
  },

  // ── Node CRUD ──
  addNode: (node) => {
    if (_yNodes) {
      _yNodes.doc!.transact(() => {
        _yNodes!.set(node.id, nodeToYMap(node));
      });
    } else {
      set((s) => ({ nodes: [...s.nodes, node] }));
    }
  },

  removeNode: (nodeId) => {
    if (_yNodes && _yEdges) {
      _yNodes.doc!.transact(() => {
        _yNodes!.delete(nodeId);
        // Remove connected edges
        _yEdges!.forEach((yEdge, edgeId) => {
          if (yEdge.get('source') === nodeId || yEdge.get('target') === nodeId) {
            _yEdges!.delete(edgeId);
          }
        });
      });
      set((s) => ({
        selectedNodeIds: s.selectedNodeIds.filter((id) => id !== nodeId),
      }));
    } else {
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== nodeId),
        edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        selectedNodeIds: s.selectedNodeIds.filter((id) => id !== nodeId),
      }));
    }
  },

  updateNodePosition: (nodeId, position) => {
    if (_yNodes) {
      const yNode = _yNodes.get(nodeId);
      if (yNode) {
        _yNodes.doc!.transact(() => {
          yNode.set('position_x', position.x);
          yNode.set('position_y', position.y);
        });
      }
    } else {
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
      }));
    }
  },

  updateNodeConfig: (nodeId, field, value) => {
    if (_yNodes) {
      const yNode = _yNodes.get(nodeId);
      if (yNode) {
        const config = JSON.parse((yNode.get('config') as string) || '{}');
        config[field] = value;
        yNode.set('config', JSON.stringify(config));
      }
    } else {
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === nodeId ? { ...n, config: { ...n.config, [field]: value } } : n,
        ),
      }));
    }
  },

  updateNodeLabel: (nodeId, label) => {
    if (_yNodes) {
      const yNode = _yNodes.get(nodeId);
      if (yNode) {
        yNode.set('label', label);
      }
    } else {
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)),
      }));
    }
  },

  // ── Edge CRUD ──
  addEdge: (edge) => {
    if (_yEdges) {
      _yEdges.doc!.transact(() => {
        _yEdges!.set(edge.id, edgeToYMap(edge));
      });
    } else {
      set((s) => ({ edges: [...s.edges, edge] }));
    }
  },

  removeEdge: (edgeId) => {
    if (_yEdges) {
      _yEdges.delete(edgeId);
      set((s) => ({
        selectedEdgeIds: s.selectedEdgeIds.filter((id) => id !== edgeId),
      }));
    } else {
      set((s) => ({
        edges: s.edges.filter((e) => e.id !== edgeId),
        selectedEdgeIds: s.selectedEdgeIds.filter((id) => id !== edgeId),
      }));
    }
  },

  // ── Selection (local only) ──
  setSelectedNodes: (ids) => set({ selectedNodeIds: ids }),
  setSelectedEdges: (ids) => set({ selectedEdgeIds: ids }),
  clearSelection: () => set({ selectedNodeIds: [], selectedEdgeIds: [] }),

  // ── Bulk ──
  removeSelected: () => {
    const { selectedNodeIds, selectedEdgeIds } = get();
    if (_yNodes && _yEdges) {
      _yNodes.doc!.transact(() => {
        for (const nodeId of selectedNodeIds) {
          _yNodes!.delete(nodeId);
        }
        _yEdges!.forEach((yEdge, edgeId) => {
          if (
            selectedEdgeIds.includes(edgeId) ||
            selectedNodeIds.includes(yEdge.get('source') as string) ||
            selectedNodeIds.includes(yEdge.get('target') as string)
          ) {
            _yEdges!.delete(edgeId);
          }
        });
      });
      set({ selectedNodeIds: [], selectedEdgeIds: [] });
    } else {
      set((s) => ({
        nodes: s.nodes.filter((n) => !selectedNodeIds.includes(n.id)),
        edges: s.edges.filter(
          (e) =>
            !selectedEdgeIds.includes(e.id) &&
            !selectedNodeIds.includes(e.source) &&
            !selectedNodeIds.includes(e.target),
        ),
        selectedNodeIds: [],
        selectedEdgeIds: [],
      }));
    }
  },

  duplicateSelected: () => {
    const { selectedNodeIds, nodes, edges } = get();
    const nodeIdMap: Record<string, string> = {};
    const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));

    const newNodes = selectedNodes.map((n) => {
      const newId = generateId();
      nodeIdMap[n.id] = newId;
      return {
        ...JSON.parse(JSON.stringify(n)),
        id: newId,
        position: { x: n.position.x + 50, y: n.position.y + 50 },
      } as GraphNode;
    });

    const internalEdges = edges.filter(
      (e) => selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target),
    );
    const newEdges = internalEdges.map(
      (e) =>
        ({
          ...JSON.parse(JSON.stringify(e)),
          id: generateId(),
          source: nodeIdMap[e.source],
          target: nodeIdMap[e.target],
        }) as GraphEdge,
    );

    if (_yNodes && _yEdges) {
      _yNodes.doc!.transact(() => {
        for (const node of newNodes) _yNodes!.set(node.id, nodeToYMap(node));
        for (const edge of newEdges) _yEdges!.set(edge.id, edgeToYMap(edge));
      });
    } else {
      set((s) => ({
        nodes: [...s.nodes, ...newNodes],
        edges: [...s.edges, ...newEdges],
      }));
    }

    set({ selectedNodeIds: newNodes.map((n) => n.id) });
    return { nodeIdMap };
  },

  // ── Serialisation ──
  getGraphSnapshot: () => {
    const { nodes, edges } = get();
    return JSON.parse(JSON.stringify({ nodes, edges }));
  },

  loadGraph: (nodes, edges) => {
    if (_yNodes && _yEdges) {
      _yNodes.doc!.transact(() => {
        _yNodes!.clear();
        _yEdges!.clear();
        for (const node of nodes) _yNodes!.set(node.id, nodeToYMap(node));
        for (const edge of edges) _yEdges!.set(edge.id, edgeToYMap(edge));
      });
    } else {
      set({
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      });
    }
    set({ selectedNodeIds: [], selectedEdgeIds: [] });
  },

  // ── Undo/Redo ──
  undo: () => _undoManager?.undo(),
  redo: () => _undoManager?.redo(),

  // ── UI ──
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  setHistoryMode: (mode) => set({ historyMode: mode }),

  // ── Fork ──
  createFork: () => {
    const { nodes, edges } = get();
    const forkId = generateId();
    const forkNodes = JSON.parse(JSON.stringify(nodes)) as GraphNode[];
    const forkEdges = JSON.parse(JSON.stringify(edges)) as GraphEdge[];

    // Save main branch if first fork
    const mainSnapshot = get().mainBranchSnapshot ?? {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    set((s) => ({
      forks: { ...s.forks, [forkId]: { nodes: forkNodes, edges: forkEdges } },
      activeForkId: forkId,
      mainBranchSnapshot: mainSnapshot,
      // Load fork's copy into active graph
      nodes: forkNodes,
      edges: forkEdges,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    }));

    return forkId;
  },

  switchFork: (forkId) => {
    const state = get();

    // Save current state back to its source
    if (state.activeForkId) {
      // Save current edits back to active fork
      const currentSnapshot = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
      set((s) => ({
        forks: { ...s.forks, [s.activeForkId!]: currentSnapshot },
      }));
    } else if (state.mainBranchSnapshot) {
      // Save main branch state
      set({
        mainBranchSnapshot: {
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
        },
      });
    }

    if (forkId === null) {
      // Switch back to main branch
      const main = get().mainBranchSnapshot;
      if (main) {
        set({
          nodes: JSON.parse(JSON.stringify(main.nodes)),
          edges: JSON.parse(JSON.stringify(main.edges)),
          activeForkId: null,
          selectedNodeIds: [],
          selectedEdgeIds: [],
        });
      }
    } else {
      // Switch to fork
      const fork = state.forks[forkId];
      if (fork) {
        set({
          nodes: JSON.parse(JSON.stringify(fork.nodes)),
          edges: JSON.parse(JSON.stringify(fork.edges)),
          activeForkId: forkId,
          selectedNodeIds: [],
          selectedEdgeIds: [],
        });
      }
    }
  },

  deleteFork: (forkId) => {
    const state = get();
    const { [forkId]: _, ...rest } = state.forks;

    if (state.activeForkId === forkId) {
      // Switch back to main
      const main = state.mainBranchSnapshot;
      set({
        forks: rest,
        activeForkId: null,
        nodes: main ? JSON.parse(JSON.stringify(main.nodes)) : state.nodes,
        edges: main ? JSON.parse(JSON.stringify(main.edges)) : state.edges,
        mainBranchSnapshot: Object.keys(rest).length === 0 ? null : state.mainBranchSnapshot,
        selectedNodeIds: [],
        selectedEdgeIds: [],
      });
    } else {
      set({
        forks: rest,
        mainBranchSnapshot: Object.keys(rest).length === 0 ? null : state.mainBranchSnapshot,
      });
    }
  },
}));

// Expose store for E2E testing
if (typeof window !== 'undefined') {
  (window as any).__REFRACT_STORE__ = useGraphStore;
}
