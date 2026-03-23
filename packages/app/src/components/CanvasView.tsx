'use client';

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { YjsProvider } from '@/providers/YjsProvider';
import { useYjsSync } from '@/hooks/useYjsSync';
import { useGraphStore } from '@/stores/graphStore';

function CanvasInner() {
  useYjsSync();
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const historyMode = useGraphStore((s) => s.historyMode);

  const rfNodes = nodes.map((n) => ({
    id: n.id,
    type: 'default',
    position: n.position,
    data: { label: n.label },
  }));

  const rfEdges = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.source_handle,
    targetHandle: e.target_handle,
    label: e.label ?? undefined,
  }));

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodesDraggable={!historyMode}
        nodesConnectable={!historyMode}
        elementsSelectable={!historyMode}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

const DEFAULT_CANVAS_ID = 'default';

export default function CanvasView({ canvasId }: { canvasId?: string }) {
  return (
    <YjsProvider canvasId={canvasId ?? DEFAULT_CANVAS_ID}>
      <CanvasInner />
    </YjsProvider>
  );
}
