'use client';

import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export function ToolCallEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd } = props;
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{ stroke: '#2563EB', strokeWidth: 1.5, strokeDasharray: '2 3' }}
    />
  );
}
