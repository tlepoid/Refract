'use client';

import { useEffect } from 'react';
import { useYjs } from '@/providers/YjsProvider';
import { useGraphStore } from '@/stores/graphStore';

/**
 * Binds the Zustand graphStore to the Yjs document.
 * Call once inside the YjsProvider tree.
 */
export function useYjsSync() {
  const { nodes, edges, undoManager } = useYjs();
  const bindYjs = useGraphStore((s) => s.bindYjs);

  useEffect(() => {
    const unbind = bindYjs(nodes, edges, undoManager);
    return unbind;
  }, [nodes, edges, undoManager, bindYjs]);
}
