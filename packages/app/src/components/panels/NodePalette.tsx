'use client';

import { NodeType } from '@refract/shared';
import { nodeRegistry } from '../canvas/nodeRegistry';
import { useGraphStore } from '../../stores/graphStore';

const NODE_GROUPS = [
  {
    label: 'Components',
    types: [NodeType.LLM, NodeType.TOOL, NodeType.MEMORY],
  },
  {
    label: 'Orchestration',
    types: [NodeType.ROUTER, NodeType.PLANNER],
  },
  {
    label: 'Safety',
    types: [NodeType.GUARDRAIL, NodeType.HUMAN_IN_LOOP],
  },
  {
    label: 'I/O',
    types: [NodeType.INPUT, NodeType.OUTPUT],
  },
];

function nodeTypeLabel(type: NodeType): string {
  const labels: Record<NodeType, string> = {
    [NodeType.LLM]: 'LLM',
    [NodeType.TOOL]: 'Tool',
    [NodeType.MEMORY]: 'Memory',
    [NodeType.ROUTER]: 'Router',
    [NodeType.PLANNER]: 'Planner',
    [NodeType.GUARDRAIL]: 'Guardrail',
    [NodeType.HUMAN_IN_LOOP]: 'Human-in-Loop',
    [NodeType.INPUT]: 'Input',
    [NodeType.OUTPUT]: 'Output',
  };
  return labels[type];
}

export function NodePalette() {
  const leftPanelOpen = useGraphStore((s) => s.leftPanelOpen);
  const setLeftPanelOpen = useGraphStore((s) => s.setLeftPanelOpen);

  const onDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData('application/refract-node-type', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      data-testid="node-palette"
      role="navigation"
      aria-label="Node palette"
      style={{
        width: leftPanelOpen ? 240 : 40,
        height: '100%',
        background: '#1A1A2E',
        borderRight: '1px solid #2D2D3F',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        aria-expanded={leftPanelOpen}
        aria-label={leftPanelOpen ? 'Collapse palette' : 'Expand palette'}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#94A3B8',
          padding: '12px',
          cursor: 'pointer',
          fontSize: 16,
          textAlign: leftPanelOpen ? 'right' : 'center',
        }}
        title={leftPanelOpen ? 'Collapse palette' : 'Expand palette'}
      >
        {leftPanelOpen ? '\u25C0' : '\u25B6'}
      </button>

      {leftPanelOpen && (
        <div role="list" aria-label="Available nodes" style={{ padding: '0 12px 12px', overflowY: 'auto', flex: 1 }}>
          {NODE_GROUPS.map((group) => (
            <div key={group.label} data-testid={`palette-group-${group.label.toLowerCase()}`} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#8B9CB5',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 8,
                }}
              >
                {group.label}
              </div>
              {group.types.map((type) => {
                const reg = nodeRegistry[type];
                return (
                  <div
                    key={type}
                    data-testid={`palette-node-${type}`}
                    role="listitem"
                    aria-label={`${nodeTypeLabel(type)} node`}
                    draggable
                    onDragStart={(e) => onDragStart(e, type)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      marginBottom: 4,
                      borderRadius: 8,
                      cursor: 'grab',
                      background: '#16162A',
                      border: '1px solid #2D2D3F',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.borderColor = reg.color)
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.borderColor = '#2D2D3F')
                    }
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: reg.color,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>
                        {nodeTypeLabel(type)}
                      </div>
                      <div style={{ fontSize: 11, color: '#8B9CB5' }}>{reg.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
