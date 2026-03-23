'use client';

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Awareness } from 'y-protocols/awareness';

export interface YjsContextValue {
  doc: Y.Doc;
  provider: WebsocketProvider;
  awareness: Awareness;
  nodes: Y.Map<Y.Map<unknown>>;
  edges: Y.Map<Y.Map<unknown>>;
  comments: Y.Array<unknown>;
  decisions: Y.Array<unknown>;
  metadata: Y.Map<unknown>;
  undoManager: Y.UndoManager;
}

const YjsContext = createContext<YjsContextValue | null>(null);

export function useYjs(): YjsContextValue {
  const ctx = useContext(YjsContext);
  if (!ctx) throw new Error('useYjs must be used within a YjsProvider');
  return ctx;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';

export function YjsProvider({ canvasId, children }: { canvasId: string; children: React.ReactNode }) {
  const stableRef = useRef<YjsContextValue | null>(null);

  const value = useMemo(() => {
    // Clean up previous connection if canvas ID changes
    if (stableRef.current) {
      stableRef.current.provider.destroy();
      stableRef.current.doc.destroy();
    }

    const doc = new Y.Doc();
    const nodes = doc.getMap('nodes') as Y.Map<Y.Map<unknown>>;
    const edges = doc.getMap('edges') as Y.Map<Y.Map<unknown>>;
    const comments = doc.getArray('comments');
    const decisions = doc.getArray('decisions');
    const metadata = doc.getMap('metadata');

    const provider = new WebsocketProvider(`${WS_URL}/ws/canvas/${canvasId}`, canvasId, doc);
    const awareness = provider.awareness;

    const undoManager = new Y.UndoManager([nodes, edges], {
      trackedOrigins: new Set([null]),
    });

    const ctx: YjsContextValue = { doc, provider, awareness, nodes, edges, comments, decisions, metadata, undoManager };
    stableRef.current = ctx;
    return ctx;
  }, [canvasId]);

  useEffect(() => {
    return () => {
      value.undoManager.destroy();
      value.provider.destroy();
      value.doc.destroy();
    };
  }, [value]);

  return <YjsContext.Provider value={value}>{children}</YjsContext.Provider>;
}
