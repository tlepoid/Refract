'use client';

import { useEffect, useRef, useState } from 'react';
import { evaluateGraph, type Scorecard } from '@refract/shared';
import { useGraphStore } from '../stores/graphStore';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const MAX_HISTORY = 20;

export function useEval() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [history, setHistory] = useState<Scorecard[]>([]);
  const serverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevSnapshotRef = useRef('');

  useEffect(() => {
    // Client-side eval (instant)
    const patternProfiles = new Map();
    const score = evaluateGraph(nodes, edges, patternProfiles);

    // Only push to history if the score actually changed
    const snapshot = JSON.stringify(score);
    if (snapshot !== prevSnapshotRef.current) {
      prevSnapshotRef.current = snapshot;
      setScorecard(score);
      setHistory((h) => {
        const next = [...h, score];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });
    }

    // Debounced server reconciliation
    clearTimeout(serverTimerRef.current);
    if (nodes.length > 0) {
      serverTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`${SERVER_URL}/api/eval`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ graph: { nodes, edges } }),
          });
          if (res.ok) {
            const serverScore: Scorecard = await res.json();
            const serverSnap = JSON.stringify(serverScore);
            const clientSnap = JSON.stringify(score);
            if (serverSnap !== clientSnap) {
              console.warn('[eval] Client/server score mismatch', {
                client: score,
                server: serverScore,
              });
              // Server wins
              setScorecard(serverScore);
            }
          }
        } catch {
          // Server unavailable, client score stands
        }
      }, 2000);
    }

    return () => clearTimeout(serverTimerRef.current);
  }, [nodes, edges]);

  return { scorecard, history };
}
