import type { GraphNode, GraphEdge } from '@refract/shared';

interface Snapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const MAX_HISTORY = 50;

let undoStack: Snapshot[] = [];
let redoStack: Snapshot[] = [];
let configDebounceTimer: ReturnType<typeof setTimeout> | undefined;
let lastConfigSnapshot: string | undefined;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function pushSnapshot(nodes: GraphNode[], edges: GraphEdge[]) {
  const snapshot = deepClone({ nodes, edges });
  undoStack.push(snapshot);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  redoStack = [];
}

export function pushSnapshotDebounced(
  nodes: GraphNode[],
  edges: GraphEdge[],
  delay = 500,
) {
  const key = JSON.stringify({ nodes, edges });
  if (key === lastConfigSnapshot) return;

  clearTimeout(configDebounceTimer);
  configDebounceTimer = setTimeout(() => {
    lastConfigSnapshot = key;
    pushSnapshot(nodes, edges);
  }, delay);
}

export function undo(
  currentNodes: GraphNode[],
  currentEdges: GraphEdge[],
): Snapshot | null {
  if (undoStack.length === 0) return null;

  redoStack.push(deepClone({ nodes: currentNodes, edges: currentEdges }));
  const snapshot = undoStack.pop()!;
  return snapshot;
}

export function redo(
  currentNodes: GraphNode[],
  currentEdges: GraphEdge[],
): Snapshot | null {
  if (redoStack.length === 0) return null;

  undoStack.push(deepClone({ nodes: currentNodes, edges: currentEdges }));
  const snapshot = redoStack.pop()!;
  return snapshot;
}

export function canUndo(): boolean {
  return undoStack.length > 0;
}

export function canRedo(): boolean {
  return redoStack.length > 0;
}

export function clearHistory() {
  undoStack = [];
  redoStack = [];
}
