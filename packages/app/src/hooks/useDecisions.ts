'use client';

import { useCallback, useEffect, useState } from 'react';
import { useYjs } from '@/providers/YjsProvider';
import type { DecisionRecord, CommentThread } from '@refract/shared';

export function useDecisions() {
  const { decisions } = useYjs();
  const [records, setRecords] = useState<DecisionRecord[]>([]);

  useEffect(() => {
    const sync = () => {
      const result: DecisionRecord[] = [];
      for (let i = 0; i < decisions.length; i++) {
        result.push(decisions.get(i) as DecisionRecord);
      }
      setRecords(result);
    };
    decisions.observeDeep(sync);
    sync();
    return () => decisions.unobserveDeep(sync);
  }, [decisions]);

  const createDecision = useCallback(
    (thread: CommentThread, author: string) => {
      const record: DecisionRecord = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        author,
        thread_id: thread.id,
        summary: 'To be filled by AI',
        rationale: 'To be filled by AI',
        node_ids: [thread.anchor.id],
      };
      decisions.push([record]);
      return record;
    },
    [decisions],
  );

  return { records, createDecision };
}
