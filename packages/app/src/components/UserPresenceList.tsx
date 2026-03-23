'use client';

import type { UserPresence } from '@/hooks/useAwareness';

export function UserPresenceList({ users }: { users: UserPresence[] }) {
  if (users.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: 20,
        padding: '6px 12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
        fontSize: 13,
      }}
    >
      {users.map((u) => (
        <div
          key={u.clientId}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          title={u.user.name}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: u.user.color,
              display: 'inline-block',
            }}
          />
          <span>{u.user.name}</span>
        </div>
      ))}
    </div>
  );
}
