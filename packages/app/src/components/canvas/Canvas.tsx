'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
} from '@xyflow/react';
import { NodeType, EdgeType, type GraphNode, type GraphEdge } from '@refract/shared';
import { useGraphStore } from '../../stores/graphStore';
import { getReactFlowNodeTypes, nodeRegistry } from './nodeRegistry';
import { edgeTypes } from './edges/edgeTypes';
import { EdgeTypeSelector } from './EdgeTypeSelector';
import { isValidConnection } from './connectionValidation';
import { NodePalette } from '../panels/NodePalette';
import { RightSidebar } from '../panels/RightSidebar';
import { ForkPanel } from '../ForkPanel';
import { ShortcutOverlay } from './ShortcutOverlay';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { pushSnapshot } from '../../stores/undoRedoMiddleware';
import { useGhostElements, SuggestionActions } from './SuggestionOverlay';
import { MermaidModal } from '../panels/MermaidModal';
import { ComparisonMode } from './ComparisonMode';
import { useComparisonStore } from '../../stores/comparisonStore';
import type { BaseNodeData } from './BaseNode';

const rfNodeTypes = getReactFlowNodeTypes();

function toReactFlowNode(graphNode: GraphNode): Node {
  return {
    id: graphNode.id,
    type: graphNode.type,
    position: graphNode.position,
    selected: false,
    data: { graphNode } as BaseNodeData,
  };
}

function toReactFlowEdge(graphEdge: GraphEdge): Edge {
  return {
    id: graphEdge.id,
    source: graphEdge.source,
    target: graphEdge.target,
    sourceHandle: graphEdge.source_handle,
    targetHandle: graphEdge.target_handle,
    type: graphEdge.type,
    label: graphEdge.label ?? undefined,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  };
}

interface PendingConnection {
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  sourceNodeType?: NodeType;
  targetNodeType?: NodeType;
}

function CanvasInner() {
  const { showOverlay, setShowOverlay } = useKeyboardShortcuts();
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const selectedNodeIds = useGraphStore((s) => s.selectedNodeIds);
  const addNode = useGraphStore((s) => s.addNode);
  const addEdge = useGraphStore((s) => s.addEdge);
  const updateNodePosition = useGraphStore((s) => s.updateNodePosition);
  const setSelectedNodes = useGraphStore((s) => s.setSelectedNodes);
  const setSelectedEdges = useGraphStore((s) => s.setSelectedEdges);

  const { ghostNodes, ghostEdges, removedNodeIds } = useGhostElements();

  const [mermaidModal, setMermaidModal] = useState<'export' | 'import' | null>(null);

  const [pendingConnection, setPendingConnection] = useState<{
    connection: PendingConnection;
    position: { x: number; y: number };
  } | null>(null);

  const rfNodes: Node[] = useMemo(() => {
    const base = nodes.map((n) => {
      const rfn = toReactFlowNode(n);
      rfn.selected = selectedNodeIds.includes(n.id);
      if (removedNodeIds.has(n.id)) {
        rfn.style = {
          ...rfn.style,
          opacity: 0.4,
          outline: '2px dashed #F87171',
          outlineOffset: 4,
        };
      }
      return rfn;
    });
    return [...base, ...ghostNodes];
  }, [nodes, selectedNodeIds, ghostNodes, removedNodeIds]);

  const rfEdges: Edge[] = useMemo(
    () => [...edges.map(toReactFlowEdge), ...ghostEdges],
    [edges, ghostEdges],
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const selectionChanges = changes.filter((c) => c.type === 'select');
      if (selectionChanges.length > 0) {
        const newSelected = new Set(selectedNodeIds);
        for (const change of selectionChanges) {
          if (change.type === 'select') {
            if (change.selected) {
              newSelected.add(change.id);
            } else {
              newSelected.delete(change.id);
            }
          }
        }
        setSelectedNodes(Array.from(newSelected));
      }

      // position changes
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position);
        }
      }
    },
    [selectedNodeIds, setSelectedNodes, updateNodePosition],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const selectionChanges = changes.filter((c) => c.type === 'select');
      if (selectionChanges.length > 0) {
        const currentSelected = useGraphStore.getState().selectedEdgeIds;
        const newSelected = new Set(currentSelected);
        for (const change of selectionChanges) {
          if (change.type === 'select') {
            if (change.selected) newSelected.add(change.id);
            else newSelected.delete(change.id);
          }
        }
        setSelectedEdges(Array.from(newSelected));
      }
    },
    [setSelectedEdges],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const validCtx = { nodes, edges: rfEdges };
      if (!isValidConnection(connection, validCtx)) return;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      setPendingConnection({
        connection: {
          source: connection.source,
          sourceHandle: connection.sourceHandle || '',
          target: connection.target,
          targetHandle: connection.targetHandle || '',
          sourceNodeType: sourceNode?.type,
          targetNodeType: targetNode?.type,
        },
        position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      });
    },
    [nodes, rfEdges],
  );

  const handleEdgeTypeSelect = useCallback(
    (edgeType: EdgeType) => {
      if (!pendingConnection) return;
      const { connection } = pendingConnection;

      pushSnapshot(nodes, edges);

      const newEdge: GraphEdge = {
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        source_handle: connection.sourceHandle,
        target_handle: connection.targetHandle,
        type: edgeType,
        label: null,
      };
      addEdge(newEdge);
      setPendingConnection(null);
    },
    [pendingConnection, nodes, edges, addEdge],
  );

  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      pushSnapshot(
        useGraphStore.getState().nodes,
        useGraphStore.getState().edges,
      );
    },
    [],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData('application/refract-node-type') as NodeType;
      if (!nodeType || !nodeRegistry[nodeType]) return;

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const reg = nodeRegistry[nodeType];

      const newNode: GraphNode = {
        id: crypto.randomUUID(),
        type: nodeType,
        label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace(/_/g, ' '),
        position,
        config: { ...reg.defaultConfig },
        pattern_id: null,
        metadata: {},
      };

      pushSnapshot(nodes, edges);
      addNode(newNode);
    },
    [screenToFlowPosition, nodes, edges, addNode],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const connectionValidator = useCallback(
    (connection: Edge | Connection) => {
      return isValidConnection(connection, { nodes, edges: rfEdges });
    },
    [nodes, rfEdges],
  );

  return (
    <div data-testid="canvas-container" style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0F0F1A' }}>
      <NodePalette />

      <div style={{ flex: 1, position: 'relative' }}>
        {/* Toolbar */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 10,
            display: 'flex',
            gap: 4,
            background: '#1A1A2E',
            borderRadius: 8,
            border: '1px solid #2D2D3F',
            padding: 4,
          }}
        >
          <button
            onClick={() => setMermaidModal('export')}
            style={toolbarButtonStyle}
            title="Export Mermaid"
          >
            Export
          </button>
          <button
            onClick={() => setMermaidModal('import')}
            style={toolbarButtonStyle}
            title="Import Mermaid"
          >
            Import
          </button>
          <div style={{ width: 1, background: '#2D2D3F', margin: '2px 0' }} />
          <button
            onClick={() => {
              const { nodes, edges } = useGraphStore.getState();
              if (nodes.length > 0) {
                useComparisonStore.getState().startComparison(nodes, edges);
              }
            }}
            style={toolbarButtonStyle}
            title="Compare designs"
          >
            Compare
          </button>
        </div>

        <ReactFlow
          aria-label="Agent design canvas"
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={rfNodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onDrop={onDrop}
          onDragOver={onDragOver}
          isValidConnection={connectionValidator}
          selectionOnDrag
          selectNodesOnDrag
          multiSelectionKeyCode="Shift"
          defaultEdgeOptions={{
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          }}
          fitView
          style={{ background: '#0F0F1A' }}
        >
          <Background color="#1E1E2E" gap={20} />
          <Controls
            style={{
              background: '#1A1A2E',
              borderRadius: 8,
              border: '1px solid #2D2D3F',
            }}
          />
          <MiniMap
            style={{
              background: '#1A1A2E',
              border: '1px solid #2D2D3F',
              borderRadius: 8,
            }}
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>

        <SuggestionActions />

        {pendingConnection && (
          <EdgeTypeSelector
            position={pendingConnection.position}
            connection={pendingConnection.connection}
            onSelect={handleEdgeTypeSelect}
            onCancel={() => setPendingConnection(null)}
          />
        )}
      </div>

      <RightSidebar />

      {showOverlay && <ShortcutOverlay onClose={() => setShowOverlay(false)} />}

      {mermaidModal && (
        <MermaidModal mode={mermaidModal} onClose={() => setMermaidModal(null)} />
      )}
    </div>
  );
}

const toolbarButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: 'transparent',
  color: '#94A3B8',
  border: 'none',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

export function Canvas() {
  const comparisonActive = useComparisonStore((s) => s.active);

  if (comparisonActive) {
    return <ComparisonMode />;
  }

  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
