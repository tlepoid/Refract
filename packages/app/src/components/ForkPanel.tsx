'use client';

import { useGraphStore } from '../stores/graphStore';

export function ForkPanel() {
  const forks = useGraphStore((s) => s.forks);
  const activeForkId = useGraphStore((s) => s.activeForkId);
  const createFork = useGraphStore((s) => s.createFork);
  const switchFork = useGraphStore((s) => s.switchFork);
  const deleteFork = useGraphStore((s) => s.deleteFork);

  const forkIds = Object.keys(forks);

  return (
    <div
      data-testid="fork-panel"
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        backgroundColor: '#1A1A2E',
        border: '1px solid #2D2D3F',
        borderRadius: 8,
        fontSize: 13,
        color: '#E0E0E0',
      }}
    >
      <button
        data-testid="fork-button"
        onClick={() => createFork()}
        style={{
          padding: '4px 10px',
          backgroundColor: '#7C3AED',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        Fork
      </button>

      {activeForkId && (
        <span
          data-testid="fork-indicator"
          style={{
            padding: '2px 8px',
            backgroundColor: '#F59E0B33',
            border: '1px solid #F59E0B',
            borderRadius: 4,
            fontSize: 11,
            color: '#F59E0B',
          }}
        >
          Fork: {activeForkId.slice(0, 8)}
        </span>
      )}

      {activeForkId && (
        <button
          data-testid="fork-return-main"
          onClick={() => switchFork(null)}
          style={{
            padding: '4px 10px',
            backgroundColor: '#2563EB',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Main
        </button>
      )}

      {forkIds.map((forkId) => (
        <div key={forkId} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {forkId !== activeForkId && (
            <button
              onClick={() => switchFork(forkId)}
              style={{
                padding: '2px 8px',
                backgroundColor: '#374151',
                color: '#E0E0E0',
                border: '1px solid #4B5563',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              {forkId.slice(0, 8)}
            </button>
          )}
          <button
            data-testid={`fork-delete-${forkId.slice(0, 8)}`}
            onClick={() => deleteFork(forkId)}
            style={{
              padding: '2px 6px',
              backgroundColor: 'transparent',
              color: '#EF4444',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
