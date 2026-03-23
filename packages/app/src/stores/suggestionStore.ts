import { create } from 'zustand';

export interface SuggestionDiff {
  description: string;
  node_diff: {
    action: 'add' | 'remove' | 'modify';
    node_id: string;
    details: string;
  }[];
  edge_diff: {
    action: 'add' | 'remove' | 'modify';
    edge_id: string;
    details: string;
  }[];
}

export interface SuggestionState {
  suggestion: SuggestionDiff | null;
}

export interface SuggestionActions {
  setSuggestion: (diff: SuggestionDiff) => void;
  clearSuggestion: () => void;
}

export type SuggestionStore = SuggestionState & SuggestionActions;

export const useSuggestionStore = create<SuggestionStore>()((set) => ({
  suggestion: null,

  setSuggestion: (diff) => set({ suggestion: diff }),
  clearSuggestion: () => set({ suggestion: null }),
}));
