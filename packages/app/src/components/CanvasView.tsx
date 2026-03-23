'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { YjsProvider } from '@/providers/YjsProvider';
import { useYjsSync } from '@/hooks/useYjsSync';
import { useAwareness } from '@/hooks/useAwareness';
import { useGraphStore } from '@/stores/graphStore';
import { RemoteCursors } from './RemoteCursors';
import { UserPresenceList } from './UserPresenceList';

function CanvasInner() {
  useYjsSync();
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const historyMode = useGraphStore((s) => s.historyMode);
  const selectedNodeIds = useGraphStore((s) => s.selectedNodeIds);
  const { remoteUsers, updateCursor, updateSelectedNodes } = useAwareness();

  const rfNodes = nodes.map((n) => {
    // Check if any remote user has this node selected
    const remoteSelector = remoteUsers.find((u) => u.selectedNodeIds.includes(n.id));
    return {
      id: n.id,
      type: 'default',
      position: n.position,
      data: { label: n.label },
      style: remoteSelector
        ? { boxShadow: `0 0 0 3px ${remoteSelector.user.color}`, borderRadius: 4 }
        : undefined,
    };
  });

  const rfEdges = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.source_handle,
    targetHandle: e.target_handle,
    label: e.label ?? undefined,
  }));

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      updateCursor({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    },
    [updateCursor],
  );

  const handleMouseLeave = useCallback(() => {
    updateCursor(null);
  }, [updateCursor]);

  // Broadcast selected nodes to awareness
  const handleSelectionChange = useCallback(() => {
    updateSelectedNodes(selectedNodeIds);
  }, [selectedNodeIds, updateSelectedNodes]);

  // Keep awareness updated with selection
  handleSelectionChange();

  return (
    <div
      style={{ width: '100vw', height: '100vh', position: 'relative' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <UserPresenceList users={remoteUsers} />
      <RemoteCursors users={remoteUsers} />
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
