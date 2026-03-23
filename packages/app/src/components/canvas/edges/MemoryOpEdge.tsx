'use client';

import { getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export function MemoryOpEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd } = props;
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });

  return (
    <g>
      <path
        d={edgePath}
        fill="none"
        stroke="#0D9488"
        strokeWidth={4}
        markerEnd={markerEnd}
      />
      <path
        d={edgePath}
        fill="none"
        stroke="#1a1a2e"
        strokeWidth={2}
      />
    </g>
  );
}
