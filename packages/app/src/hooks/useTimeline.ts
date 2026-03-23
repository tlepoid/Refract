'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { useYjs } from '@/providers/YjsProvider';
import { useGraphStore } from '@/stores/graphStore';
import type { DecisionRecord, GraphNode, GraphEdge } from '@refract/shared';

export interface TimelineSnapshot {
  index: number;
  timestamp: number;
  update: Uint8Array;
  decision?: DecisionRecord;
}

export function useTimeline() {
  const { doc, decisions } = useYjs();
  const setHistoryMode = useGraphStore((s) => s.setHistoryMode);

  // Accumulate all updates
  const updatesRef = useRef<Uint8Array[]>([]);
  const [snapshots, setSnapshots] = useState<TimelineSnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1); // -1 = live

  // Record every update
  useEffect(() => {
    const handler = (update: Uint8Array) => {
      updatesRef.current.push(new Uint8Array(update));
    };
    doc.on('update', handler);
    return () => {
      doc.off('update', handler);
    };
  }, [doc]);

  // Rebuild snapshots when decisions change
  useEffect(() => {
    const rebuild = () => {
      const decisionRecords: DecisionRecord[] = [];
      for (let i = 0; i < decisions.length; i++) {
        decisionRecords.push(decisions.get(i) as DecisionRecord);
      }

      // Create a snapshot for each accumulated update, marking decision boundaries
      const allUpdates = updatesRef.current;
      const newSnapshots: TimelineSnapshot[] = [];

      for (let i = 0; i < allUpdates.length; i++) {
        // Check if a decision was created around this point
        const matchingDecision = decisionRecords.find((d, di) => {
          // Map decisions to update indices roughly (evenly distributed)
          const approxIndex = Math.floor(((di + 1) / decisionRecords.length) * allUpdates.length);
          return Math.abs(approxIndex - i) <= 1;
        });

        newSnapshots.push({
          index: i,
          timestamp: Date.now() - (allUpdates.length - i) * 100, // approximate
          update: allUpdates[i],
          decision: matchingDecision,
        });
      }

      setSnapshots(newSnapshots);
    };

    decisions.observeDeep(rebuild);
    rebuild();
    return () => decisions.unobserveDeep(rebuild);
  }, [decisions]);

  const scrubTo = useCallback(
    (index: number) => {
      if (index < 0 || updatesRef.current.length === 0) {
        // Return to live
        setCurrentIndex(-1);
        setHistoryMode(false);
        return;
      }

      setCurrentIndex(index);
      setHistoryMode(true);

      // Reconstruct state at this point by replaying updates into a temp doc
      const tempDoc = new Y.Doc();
      for (let i = 0; i <= Math.min(index, updatesRef.current.length - 1); i++) {
        Y.applyUpdate(tempDoc, updatesRef.current[i]);
      }

      // Read nodes and edges from the temp doc
      const yNodes = tempDoc.getMap('nodes') as Y.Map<Y.Map<unknown>>;
      const yEdges = tempDoc.getMap('edges') as Y.Map<Y.Map<unknown>>;

      const historicNodes: GraphNode[] = [];
      yNodes.forEach((yNode) => {
        historicNodes.push({
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
        });
      });

      const historicEdges: GraphEdge[] = [];
      yEdges.forEach((yEdge) => {
        historicEdges.push({
          id: yEdge.get('id') as string,
          source: yEdge.get('source') as string,
          target: yEdge.get('target') as string,
          source_handle: yEdge.get('source_handle') as string,
          target_handle: yEdge.get('target_handle') as string,
          type: yEdge.get('type') as GraphEdge['type'],
          label: (yEdge.get('label') as string | null) ?? null,
        });
      });

      // Update the store with historic state (bypassing Yjs to avoid syncing)
      useGraphStore.setState({ nodes: historicNodes, edges: historicEdges });

      tempDoc.destroy();
    },
    [setHistoryMode],
  );

  const returnToLive = useCallback(() => {
    scrubTo(-1);
  }, [scrubTo]);

  return {
    snapshots,
    currentIndex,
    totalUpdates: updatesRef.current.length,
    scrubTo,
    returnToLive,
    isHistoryMode: currentIndex >= 0,
  };
}
