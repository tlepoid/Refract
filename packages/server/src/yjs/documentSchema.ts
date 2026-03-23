import * as Y from 'yjs';

/**
 * Initialises the canonical Yjs document structure for a canvas.
 * Safe to call multiple times — Y.Doc.getMap / getArray are idempotent.
 */
export function initCanvasDoc(doc: Y.Doc): {
  nodes: Y.Map<Y.Map<unknown>>;
  edges: Y.Map<Y.Map<unknown>>;
  comments: Y.Array<unknown>;
  decisions: Y.Array<unknown>;
  metadata: Y.Map<unknown>;
} {
  const nodes = doc.getMap('nodes') as Y.Map<Y.Map<unknown>>;
  const edges = doc.getMap('edges') as Y.Map<Y.Map<unknown>>;
  const comments = doc.getArray('comments');
  const decisions = doc.getArray('decisions');
  const metadata = doc.getMap('metadata');

  return { nodes, edges, comments, decisions, metadata };
}
