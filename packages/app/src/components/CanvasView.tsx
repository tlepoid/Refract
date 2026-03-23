'use client';

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function CanvasView() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow>
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
