'use client';

import { useCallback, useEffect, useState } from 'react';
import { useYjs } from '@/providers/YjsProvider';
import type { CommentThread, CommentMessage } from '@refract/shared';

export function useComments() {
  const { comments } = useYjs();
  const [threads, setThreads] = useState<CommentThread[]>([]);

  useEffect(() => {
    const sync = () => {
      const result: CommentThread[] = [];
      for (let i = 0; i < comments.length; i++) {
        result.push(comments.get(i) as CommentThread);
      }
      setThreads(result);
    };
    comments.observeDeep(sync);
    sync();
    return () => comments.unobserveDeep(sync);
  }, [comments]);

  const addThread = useCallback(
    (nodeId: string, author: string, text: string): CommentThread => {
      const thread: CommentThread = {
        id: crypto.randomUUID(),
        anchor: { type: 'node', id: nodeId },
        status: 'open',
        messages: [
          {
            id: crypto.randomUUID(),
            author,
            text,
            timestamp: new Date().toISOString(),
          },
        ],
      };
      comments.push([thread]);
      return thread;
    },
    [comments],
  );

  const addReply = useCallback(
    (threadId: string, author: string, text: string) => {
      for (let i = 0; i < comments.length; i++) {
        const thread = comments.get(i) as CommentThread;
        if (thread.id === threadId) {
          const updated: CommentThread = {
            ...thread,
            messages: [
              ...thread.messages,
              {
                id: crypto.randomUUID(),
                author,
                text,
                timestamp: new Date().toISOString(),
              },
            ],
          };
          comments.delete(i, 1);
          comments.insert(i, [updated]);
          return;
        }
      }
    },
    [comments],
  );

  const resolveThread = useCallback(
    (threadId: string): CommentThread | null => {
      for (let i = 0; i < comments.length; i++) {
        const thread = comments.get(i) as CommentThread;
        if (thread.id === threadId) {
          const updated: CommentThread = { ...thread, status: 'resolved' };
          comments.delete(i, 1);
          comments.insert(i, [updated]);
          return updated;
        }
      }
      return null;
    },
    [comments],
  );

  const wontfixThread = useCallback(
    (threadId: string) => {
      for (let i = 0; i < comments.length; i++) {
        const thread = comments.get(i) as CommentThread;
        if (thread.id === threadId) {
          const updated: CommentThread = { ...thread, status: 'wontfix' };
          comments.delete(i, 1);
          comments.insert(i, [updated]);
          return;
        }
      }
    },
    [comments],
  );

  const getThreadsForNode = useCallback(
    (nodeId: string) => threads.filter((t) => t.anchor.id === nodeId),
    [threads],
  );

  const getOpenThreadsForNode = useCallback(
    (nodeId: string) => threads.filter((t) => t.anchor.id === nodeId && t.status === 'open'),
    [threads],
  );

  return { threads, addThread, addReply, resolveThread, wontfixThread, getThreadsForNode, getOpenThreadsForNode };
}
