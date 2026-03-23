'use client';

import { useTimeline } from '@/hooks/useTimeline';
import type { DecisionRecord } from '@refract/shared';
import { useState } from 'react';

export function TimelineSlider() {
  const { snapshots, currentIndex, totalUpdates, scrubTo, returnToLive, isHistoryMode } = useTimeline();
  const [hoveredDecision, setHoveredDecision] = useState<DecisionRecord | null>(null);

  if (totalUpdates === 0) return null;

  const decisionSnapshots = snapshots.filter((s) => s.decision);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: isHistoryMode ? 64 : 40,
        backgroundColor: isHistoryMode ? 'rgba(254,243,199,0.95)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        zIndex: 80,
        transition: 'height 0.2s, background-color 0.2s',
      }}
    >
      {isHistoryMode && (
        <div
          style={{
            fontSize: 11,
            color: '#92400e',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          HISTORY MODE
        </div>
      )}

      <div style={{ flex: 1, position: 'relative', height: 20 }}>
        <input
          type="range"
          min={0}
          max={totalUpdates - 1}
          value={currentIndex >= 0 ? currentIndex : totalUpdates - 1}
          onChange={(e) => scrubTo(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />

        {/* Decision markers */}
        {decisionSnapshots.map((snap) => {
          const left = (snap.index / (totalUpdates - 1)) * 100;
          return (
            <div
              key={snap.decision!.id}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: -4,
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#1d4ed8',
                border: '2px solid white',
                cursor: 'pointer',
                transform: 'translateX(-50%)',
                zIndex: 2,
              }}
              title={snap.decision!.summary}
              onClick={() => scrubTo(snap.index)}
              onMouseEnter={() => setHoveredDecision(snap.decision!)}
              onMouseLeave={() => setHoveredDecision(null)}
            />
          );
        })}

        {/* Decision tooltip */}
        {hoveredDecision && (
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'white',
              padding: '6px 10px',
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              fontSize: 12,
              maxWidth: 250,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              zIndex: 10,
            }}
          >
            <strong>{hoveredDecision.author}</strong>: {hoveredDecision.summary}
          </div>
        )}
      </div>

      {isHistoryMode && (
        <button
          onClick={returnToLive}
          style={{
            padding: '4px 12px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Return to Live
        </button>
      )}
    </div>
  );
}
