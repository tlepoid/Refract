import { create } from 'zustand';
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
  rightPanelTab: 'properties' | 'analysis' | 'eval' | 'patterns';
}

export interface GraphActions {
  // Node CRUD
  addNode: (node: GraphNode) => void;
  removeNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeConfig: (nodeId: string, field: string, value: any) => void;
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

  // UI
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setRightPanelTab: (tab: UIState['rightPanelTab']) => void;
}

export type GraphStore = GraphState & UIState & GraphActions;

function generateId(): string {
  return crypto.randomUUID();
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const useGraphStore = create<GraphStore>()((set, get) => ({
  // ── Initial state ──
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  selectedEdgeIds: [],
  leftPanelOpen: true,
  rightPanelOpen: false,
  rightPanelTab: 'properties',

  // ── Node CRUD ──
  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),

  removeNode: (nodeId) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== nodeId),
      edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeIds: s.selectedNodeIds.filter((id) => id !== nodeId),
    })),

  updateNodePosition: (nodeId, position) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
    })),

  updateNodeConfig: (nodeId, field, value) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, config: { ...n.config, [field]: value } } : n,
      ),
    })),

  updateNodeLabel: (nodeId, label) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)),
    })),

  // ── Edge CRUD ──
  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),

  removeEdge: (edgeId) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== edgeId),
      selectedEdgeIds: s.selectedEdgeIds.filter((id) => id !== edgeId),
    })),

  // ── Selection ──
  setSelectedNodes: (ids) => set({ selectedNodeIds: ids }),
  setSelectedEdges: (ids) => set({ selectedEdgeIds: ids }),
  clearSelection: () => set({ selectedNodeIds: [], selectedEdgeIds: [] }),

  // ── Bulk ──
  removeSelected: () => {
    const { selectedNodeIds, selectedEdgeIds } = get();
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
  },

  duplicateSelected: () => {
    const { selectedNodeIds, nodes, edges } = get();
    const nodeIdMap: Record<string, string> = {};

    const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
    const newNodes = selectedNodes.map((n) => {
      const newId = generateId();
      nodeIdMap[n.id] = newId;
      return {
        ...deepClone(n),
        id: newId,
        position: { x: n.position.x + 50, y: n.position.y + 50 },
      };
    });

    // Duplicate edges that connect two selected nodes
    const internalEdges = edges.filter(
      (e) => selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target),
    );
    const newEdges = internalEdges.map((e) => ({
      ...deepClone(e),
      id: generateId(),
      source: nodeIdMap[e.source],
      target: nodeIdMap[e.target],
    }));

    set((s) => ({
      nodes: [...s.nodes, ...newNodes],
      edges: [...s.edges, ...newEdges],
      selectedNodeIds: newNodes.map((n) => n.id),
    }));

    return { nodeIdMap };
  },

  // ── Serialisation ──
  getGraphSnapshot: () => {
    const { nodes, edges } = get();
    return deepClone({ nodes, edges });
  },

  loadGraph: (nodes, edges) =>
    set({
      nodes: deepClone(nodes),
      edges: deepClone(edges),
      selectedNodeIds: [],
      selectedEdgeIds: [],
    }),

  // ── UI ──
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
}));
