'use client';

import { useEffect, useRef } from 'react';
import { SHORTCUTS } from '../../hooks/useKeyboardShortcuts';

interface ShortcutOverlayProps {
  onClose: () => void;
}

export function ShortcutOverlay({ onClose }: ShortcutOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        ref={ref}
        style={{
          background: '#1E1E2E',
          borderRadius: 12,
          padding: 24,
          minWidth: 360,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#E2E8F0',
            marginBottom: 16,
          }}
        >
          Keyboard Shortcuts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#94A3B8', fontSize: 13 }}>{s.description}</span>
              <kbd
                style={{
                  background: '#2D2D3F',
                  color: '#E2E8F0',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: 'monospace',
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 12,
            color: '#64748B',
            textAlign: 'center',
          }}
        >
          Press Escape or click outside to close
        </div>
      </div>
    </div>
  );
}
