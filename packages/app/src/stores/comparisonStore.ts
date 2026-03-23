import { create } from 'zustand';
import type { GraphNode, GraphEdge, Scorecard } from '@refract/shared';

export interface ComparisonState {
  active: boolean;
  leftNodes: GraphNode[];
  leftEdges: GraphEdge[];
  rightNodes: GraphNode[];
  rightEdges: GraphEdge[];
  leftScorecard: Scorecard | null;
  rightScorecard: Scorecard | null;
  narrative: string;
  narrativeLoading: boolean;
}

export interface ComparisonActions {
  startComparison: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  exitComparison: (keep: 'left' | 'right') => { nodes: GraphNode[]; edges: GraphEdge[] };
  updateRight: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  setLeftScorecard: (s: Scorecard) => void;
  setRightScorecard: (s: Scorecard) => void;
  setNarrative: (text: string) => void;
  setNarrativeLoading: (loading: boolean) => void;
  reset: () => void;
}

export type ComparisonStore = ComparisonState & ComparisonActions;

const initial: ComparisonState = {
  active: false,
  leftNodes: [],
  leftEdges: [],
  rightNodes: [],
  rightEdges: [],
  leftScorecard: null,
  rightScorecard: null,
  narrative: '',
  narrativeLoading: false,
};

export const useComparisonStore = create<ComparisonStore>()((set, get) => ({
  ...initial,

  startComparison: (nodes, edges) => {
    const clonedNodes: GraphNode[] = JSON.parse(JSON.stringify(nodes));
    const clonedEdges: GraphEdge[] = JSON.parse(JSON.stringify(edges));
    set({
      active: true,
      leftNodes: nodes,
      leftEdges: edges,
      rightNodes: clonedNodes,
      rightEdges: clonedEdges,
    });
  },

  exitComparison: (keep) => {
    const { leftNodes, leftEdges, rightNodes, rightEdges } = get();
    const result =
      keep === 'left'
        ? { nodes: leftNodes, edges: leftEdges }
        : { nodes: rightNodes, edges: rightEdges };
    set(initial);
    return result;
  },

  updateRight: (nodes, edges) => {
    set({ rightNodes: nodes, rightEdges: edges });
  },

  setLeftScorecard: (s) => set({ leftScorecard: s }),
  setRightScorecard: (s) => set({ rightScorecard: s }),
  setNarrative: (text) => set({ narrative: text }),
  setNarrativeLoading: (loading) => set({ narrativeLoading: loading }),
  reset: () => set(initial),
}));
