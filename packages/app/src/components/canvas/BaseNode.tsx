'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NODE_HANDLES, type GraphNode } from '@refract/shared';
import { nodeRegistry } from './nodeRegistry';

export interface BaseNodeData extends Record<string, unknown> {
  graphNode: GraphNode;
}

interface BaseNodeProps {
  nodeProps: NodeProps;
  subtitle?: string;
  children?: React.ReactNode;
}

export function BaseNode({ nodeProps, subtitle, children }: BaseNodeProps) {
  const { id, selected, data } = nodeProps;
  const graphNode = (data as BaseNodeData).graphNode;
  const nodeType = graphNode.type;
  const handles = NODE_HANDLES[nodeType];
  const registration = nodeRegistry[nodeType];
  const color = registration.color;

  return (
    <div
      className="base-node"
      data-testid={`canvas-node-${id}`}
      data-node-type={nodeType}
      role="button"
      aria-label={`${graphNode.label} (${nodeType}) node`}
      tabIndex={0}
      style={{
        background: color,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 160,
        border: selected ? `2px solid #fff` : '2px solid transparent',
        boxShadow: selected
          ? `0 0 0 2px ${color}, 0 4px 12px rgba(0,0,0,0.2)`
          : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        cursor: 'grab',
        position: 'relative',
        color: '#fff',
      }}
    >
      {/* Label */}
      <div data-testid={`node-label-${id}`} style={{ fontWeight: 700, fontSize: 14, textAlign: 'center' }}>
        {graphNode.label}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            fontSize: 11,
            textAlign: 'center',
            opacity: 0.85,
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Custom children content */}
      {children}

      {/* Input handles (left side) */}
      {handles.inputs.map((name: string, i: number) => (
        <Handle
          key={`input-${name}`}
          type="target"
          position={Position.Left}
          id={name}
          style={{
            top: `${((i + 1) / (handles.inputs.length + 1)) * 100}%`,
            background: '#fff',
            width: 10,
            height: 10,
            border: `2px solid ${color}`,
          }}
          title={name}
        />
      ))}

      {/* Output handles (right side) */}
      {handles.outputs.map((name: string, i: number) => (
        <Handle
          key={`output-${name}`}
          type="source"
          position={Position.Right}
          id={name}
          style={{
            top: `${((i + 1) / (handles.outputs.length + 1)) * 100}%`,
            background: '#fff',
            width: 10,
            height: 10,
            border: `2px solid ${color}`,
          }}
          title={name}
        />
      ))}
    </div>
  );
}
