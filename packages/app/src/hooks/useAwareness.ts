'use client';

import { useCallback, useEffect, useState } from 'react';
import { useYjs } from '@/providers/YjsProvider';
import type { Awareness } from 'y-protocols/awareness';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

export interface UserPresence {
  clientId: number;
  user: { name: string; color: string };
  cursor: { x: number; y: number } | null;
  selectedNodeIds: string[];
}

function getColor(clientId: number): string {
  return COLORS[clientId % COLORS.length];
}

function getLocalUserName(): string {
  if (typeof window === 'undefined') return 'Anonymous';
  let name = sessionStorage.getItem('refract-user-name');
  if (!name) {
    name = `User-${Math.floor(Math.random() * 10000)}`;
    sessionStorage.setItem('refract-user-name', name);
  }
  return name;
}

export function useAwareness() {
  const { awareness } = useYjs();
  const [remoteUsers, setRemoteUsers] = useState<UserPresence[]>([]);

  useEffect(() => {
    const color = getColor(awareness.clientID);
    awareness.setLocalStateField('user', { name: getLocalUserName(), color });

    const onChange = () => {
      const states = awareness.getStates();
      const users: UserPresence[] = [];
      states.forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        if (!state.user) return;
        users.push({
          clientId,
          user: state.user,
          cursor: state.cursor ?? null,
          selectedNodeIds: state.selectedNodeIds ?? [],
        });
      });
      setRemoteUsers(users);
    };

    awareness.on('change', onChange);
    onChange();

    return () => {
      awareness.off('change', onChange);
    };
  }, [awareness]);

  const updateCursor = useCallback(
    (cursor: { x: number; y: number } | null) => {
      awareness.setLocalStateField('cursor', cursor);
    },
    [awareness],
  );

  const updateSelectedNodes = useCallback(
    (ids: string[]) => {
      awareness.setLocalStateField('selectedNodeIds', ids);
    },
    [awareness],
  );

  return { remoteUsers, updateCursor, updateSelectedNodes };
}
