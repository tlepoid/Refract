'use client';

import { useEffect, useRef } from 'react';
import { EdgeType, NodeType } from '@refract/shared';

const EDGE_OPTIONS: { type: EdgeType; label: string; style: string }[] = [
  { type: EdgeType.DATA_FLOW, label: 'Data Flow', style: 'solid' },
  { type: EdgeType.CONTROL_FLOW, label: 'Control Flow', style: 'dashed' },
  { type: EdgeType.TOOL_CALL, label: 'Tool Call', style: 'dotted' },
  { type: EdgeType.MEMORY_OP, label: 'Memory Op', style: 'double' },
];

interface PendingConnection {
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  sourceNodeType?: NodeType;
  targetNodeType?: NodeType;
}

interface EdgeTypeSelectorProps {
  position: { x: number; y: number };
  connection: PendingConnection;
  onSelect: (type: EdgeType) => void;
  onCancel: () => void;
}

function getSmartDefault(connection: PendingConnection): EdgeType | null {
  const { sourceHandle, targetHandle, sourceNodeType, targetNodeType } = connection;

  if (sourceHandle === 'tool_calls' && targetHandle === 'tool_call') {
    return EdgeType.TOOL_CALL;
  }
  if (sourceNodeType === NodeType.MEMORY || targetNodeType === NodeType.MEMORY) {
    return EdgeType.MEMORY_OP;
  }
  return null;
}

export function EdgeTypeSelector({ position, connection, onSelect, onCancel }: EdgeTypeSelectorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const smartDefault = getSmartDefault(connection);

  useEffect(() => {
    if (smartDefault) {
      onSelect(smartDefault);
      return;
    }

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [smartDefault, onSelect, onCancel]);

  if (smartDefault) return null;

  return (
    <div
      ref={ref}
      data-testid="edge-type-selector"
      role="dialog"
      aria-modal="true"
      aria-label="Select edge type"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        background: '#1E1E2E',
        border: '1px solid #333',
        borderRadius: 8,
        padding: 4,
        zIndex: 1000,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      {EDGE_OPTIONS.map((opt) => (
        <button
          key={opt.type}
          data-testid={`edge-type-${opt.type}`}
          onClick={() => onSelect(opt.type)}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            color: '#E2E8F0',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 13,
            borderRadius: 4,
          }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.background = '#2D2D3F')}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.background = 'transparent')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
