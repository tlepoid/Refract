'use client';

import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { YjsProvider } from '@/providers/YjsProvider';
import { useYjsSync } from '@/hooks/useYjsSync';
import { useAwareness } from '@/hooks/useAwareness';
import { useComments } from '@/hooks/useComments';
import { useDecisions } from '@/hooks/useDecisions';
import { useGraphStore } from '@/stores/graphStore';
import { RemoteCursors } from './RemoteCursors';
import { UserPresenceList } from './UserPresenceList';
import { CommentThreadPopover } from './CommentThread';
import { DecisionLogPanel } from './DecisionLogPanel';
import { TimelineSlider } from './TimelineSlider';
import type { CommentThread } from '@refract/shared';

function CanvasInner() {
  useYjsSync();
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const historyMode = useGraphStore((s) => s.historyMode);
  const selectedNodeIds = useGraphStore((s) => s.selectedNodeIds);
  const { remoteUsers, updateCursor, updateSelectedNodes } = useAwareness();
  const { threads, addThread, addReply, resolveThread, wontfixThread, getOpenThreadsForNode, getThreadsForNode } =
    useComments();
  const { records: decisionRecords, createDecision } = useDecisions();
  const rightPanelOpen = useGraphStore((s) => s.rightPanelOpen);
  const rightPanelTab = useGraphStore((s) => s.rightPanelTab);
  const setRightPanelOpen = useGraphStore((s) => s.setRightPanelOpen);
  const setRightPanelTab = useGraphStore((s) => s.setRightPanelTab);
  const reactFlowInstance = useReactFlow();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  // Active comment thread popover
  const [activeThread, setActiveThread] = useState<{ nodeId: string; thread: CommentThread } | null>(null);

  const rfNodes = nodes.map((n) => {
    const remoteSelector = remoteUsers.find((u) => u.selectedNodeIds.includes(n.id));
    const openCommentCount = getOpenThreadsForNode(n.id).length;
    return {
      id: n.id,
      type: 'default',
      position: n.position,
      data: {
        label: (
          <div style={{ position: 'relative' }}>
            {n.label}
            {openCommentCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nodeThreads = getThreadsForNode(n.id);
                  if (nodeThreads.length > 0) {
                    setActiveThread({ nodeId: n.id, thread: nodeThreads[0] });
                  }
                }}
                style={{
                  position: 'absolute',
                  top: -16,
                  right: -16,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  lineHeight: 1,
                }}
                title={`${openCommentCount} open comment${openCommentCount !== 1 ? 's' : ''}`}
              >
                {openCommentCount}
              </button>
            )}
          </div>
        ),
      },
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
  updateSelectedNodes(selectedNodeIds);

  const handleNodeContextMenu: NodeMouseHandler = useCallback((_event, node) => {
    _event.preventDefault();
    setContextMenu({
      x: (_event as unknown as MouseEvent).clientX,
      y: (_event as unknown as MouseEvent).clientY,
      nodeId: node.id,
    });
  }, []);

  const handlePaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleAddComment = useCallback(() => {
    if (!contextMenu) return;
    const userName = sessionStorage.getItem('refract-user-name') ?? 'Anonymous';
    const text = prompt('Enter comment:');
    if (text) {
      const thread = addThread(contextMenu.nodeId, userName, text);
      setActiveThread({ nodeId: contextMenu.nodeId, thread });
    }
    setContextMenu(null);
  }, [contextMenu, addThread]);

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
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            padding: 4,
            zIndex: 1000,
            minWidth: 150,
          }}
        >
          <button
            onClick={handleAddComment}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 12px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 13,
              borderRadius: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Add comment
          </button>
        </div>
      )}

      {/* Comment thread popover */}
      {activeThread && (
        <div style={{ position: 'fixed', top: 80, right: 16, zIndex: 1000 }}>
          <CommentThreadPopover
            thread={activeThread.thread}
            onReply={(text) => {
              const userName = sessionStorage.getItem('refract-user-name') ?? 'Anonymous';
              addReply(activeThread.thread.id, userName, text);
            }}
            onResolve={() => {
              const resolved = resolveThread(activeThread.thread.id);
              if (resolved) {
                const userName = sessionStorage.getItem('refract-user-name') ?? 'Anonymous';
                createDecision(resolved, userName);
              }
              setActiveThread(null);
            }}
            onWontfix={() => {
              wontfixThread(activeThread.thread.id);
              setActiveThread(null);
            }}
            onClose={() => setActiveThread(null)}
          />
        </div>
      )}
      {/* Timeline slider */}
      <TimelineSlider />

      {/* Decision log toggle */}
      <button
        onClick={() => {
          if (rightPanelTab === 'decisions' && rightPanelOpen) {
            setRightPanelOpen(false);
          } else {
            setRightPanelTab('decisions');
            setRightPanelOpen(true);
          }
        }}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 100,
          padding: '6px 14px',
          backgroundColor: '#1d4ed8',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 13,
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        }}
      >
        Decisions ({decisionRecords.length})
      </button>

      {/* Decision log panel */}
      {rightPanelOpen && rightPanelTab === 'decisions' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 340,
            height: '100%',
            backgroundColor: 'white',
            borderLeft: '1px solid #e5e7eb',
            zIndex: 90,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>Decision Log</span>
            <button
              onClick={() => setRightPanelOpen(false)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}
            >
              x
            </button>
          </div>
          <DecisionLogPanel
            records={decisionRecords}
            onNodeClick={(nodeId) => {
              const node = nodes.find((n) => n.id === nodeId);
              if (node) {
                reactFlowInstance.setCenter(node.position.x, node.position.y, { zoom: 1.5, duration: 500 });
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

const DEFAULT_CANVAS_ID = 'default';

export default function CanvasView({ canvasId }: { canvasId?: string }) {
  return (
    <YjsProvider canvasId={canvasId ?? DEFAULT_CANVAS_ID}>
      <ReactFlowProvider>
        <CanvasInner />
      </ReactFlowProvider>
    </YjsProvider>
  );
}
