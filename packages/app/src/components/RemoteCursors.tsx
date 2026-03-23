'use client';

import type { UserPresence } from '@/hooks/useAwareness';

export function RemoteCursors({ users }: { users: UserPresence[] }) {
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {users.map(
        (u) =>
          u.cursor && (
            <g key={u.clientId} transform={`translate(${u.cursor.x}, ${u.cursor.y})`}>
              <path
                d="M0 0 L0 16 L4 12 L8 18 L10 17 L6 11 L12 11 Z"
                fill={u.user.color}
                stroke="white"
                strokeWidth={1}
              />
              <rect
                x={12}
                y={10}
                width={u.user.name.length * 7 + 8}
                height={18}
                rx={3}
                fill={u.user.color}
              />
              <text x={16} y={23} fill="white" fontSize={11} fontFamily="sans-serif">
                {u.user.name}
              </text>
            </g>
          ),
      )}
    </svg>
  );
}
