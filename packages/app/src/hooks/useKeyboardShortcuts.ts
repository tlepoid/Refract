'use client';

import { useEffect, useCallback, useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import {
  undo,
  redo,
  pushSnapshot,
} from '../stores/undoRedoMiddleware';

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export interface ShortcutDef {
  key: string;
  label: string;
  description: string;
}

export const SHORTCUTS: ShortcutDef[] = [
  { key: 'Delete / Backspace', label: 'Delete', description: 'Remove selected nodes/edges' },
  { key: '\u2318Z', label: 'Undo', description: 'Undo last action' },
  { key: '\u2318\u21E7Z', label: 'Redo', description: 'Redo last undone action' },
  { key: '\u2318C', label: 'Copy', description: 'Copy selected nodes' },
  { key: '\u2318V', label: 'Paste', description: 'Paste copied nodes' },
  { key: '\u2318D', label: 'Duplicate', description: 'Duplicate selected nodes' },
  { key: '\u2318A', label: 'Select All', description: 'Select all nodes' },
  { key: 'Escape', label: 'Deselect', description: 'Deselect all' },
  { key: '?', label: 'Shortcuts', description: 'Toggle shortcut overlay' },
];

let clipboard: string | null = null;

export function useKeyboardShortcuts() {
  const [showOverlay, setShowOverlay] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();
      const store = useGraphStore.getState();

      // ? — toggle overlay
      if (e.key === '?' && !meta) {
        e.preventDefault();
        setShowOverlay((s) => !s);
        return;
      }

      // Escape — deselect or close overlay
      if (key === 'escape') {
        e.preventDefault();
        if (showOverlay) {
          setShowOverlay(false);
        } else {
          store.clearSelection();
        }
        return;
      }

      // Delete / Backspace — remove selected
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        pushSnapshot(store.nodes, store.edges);
        store.removeSelected();
        return;
      }

      // Cmd+Z — undo, Cmd+Shift+Z — redo
      if (meta && key === 'z') {
        e.preventDefault();
        if (shift) {
          const snapshot = redo(store.nodes, store.edges);
          if (snapshot) store.loadGraph(snapshot.nodes, snapshot.edges);
        } else {
          const snapshot = undo(store.nodes, store.edges);
          if (snapshot) store.loadGraph(snapshot.nodes, snapshot.edges);
        }
        return;
      }

      // Cmd+A — select all
      if (meta && key === 'a') {
        e.preventDefault();
        store.setSelectedNodes(store.nodes.map((n) => n.id));
        return;
      }

      // Cmd+D — duplicate
      if (meta && key === 'd') {
        e.preventDefault();
        if (store.selectedNodeIds.length > 0) {
          pushSnapshot(store.nodes, store.edges);
          store.duplicateSelected();
        }
        return;
      }

      // Cmd+C — copy
      if (meta && key === 'c') {
        e.preventDefault();
        const { selectedNodeIds, nodes, edges } = store;
        if (selectedNodeIds.length === 0) return;

        const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
        const internalEdges = edges.filter(
          (ed) =>
            selectedNodeIds.includes(ed.source) && selectedNodeIds.includes(ed.target),
        );
        clipboard = JSON.stringify({ nodes: selectedNodes, edges: internalEdges });
        return;
      }

      // Cmd+V — paste
      if (meta && key === 'v') {
        e.preventDefault();
        if (!clipboard) return;

        try {
          const data = JSON.parse(clipboard);
          if (!data.nodes || !Array.isArray(data.nodes)) return;

          pushSnapshot(store.nodes, store.edges);

          const nodeIdMap: Record<string, string> = {};
          const newNodes = data.nodes.map((n: any) => {
            const newId = crypto.randomUUID();
            nodeIdMap[n.id] = newId;
            return {
              ...n,
              id: newId,
              position: { x: n.position.x + 20, y: n.position.y + 20 },
            };
          });

          const newEdges = (data.edges || []).map((ed: any) => ({
            ...ed,
            id: crypto.randomUUID(),
            source: nodeIdMap[ed.source] || ed.source,
            target: nodeIdMap[ed.target] || ed.target,
          }));

          for (const n of newNodes) store.addNode(n);
          for (const ed of newEdges) store.addEdge(ed);
          store.setSelectedNodes(newNodes.map((n: any) => n.id));
        } catch {
          // invalid clipboard
        }
        return;
      }
    },
    [showOverlay],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { showOverlay, setShowOverlay };
}
