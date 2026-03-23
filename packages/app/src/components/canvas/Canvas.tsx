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
import { NodeType, EdgeType, type GraphNode, type GraphEdge, graphToMermaid, mermaidToGraph } from '@refract/shared';
import { useGraphStore } from '../../stores/graphStore';
import { getReactFlowNodeTypes, nodeRegistry } from './nodeRegistry';
import { edgeTypes } from './edges/edgeTypes';
import { EdgeTypeSelector } from './EdgeTypeSelector';
import { isValidConnection } from './connectionValidation';
import { NodePalette } from '../panels/NodePalette';
import { PropertiesPanel } from '../panels/PropertiesPanel';
import { ForkPanel } from '../ForkPanel';
import { ShortcutOverlay } from './ShortcutOverlay';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { pushSnapshot } from '../../stores/undoRedoMiddleware';
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

  const [pendingConnection, setPendingConnection] = useState<{
    connection: PendingConnection;
    position: { x: number; y: number };
  } | null>(null);

  const [mermaidModal, setMermaidModal] = useState<{ mode: 'export' | 'import'; text: string } | null>(null);

  const loadGraph = useGraphStore((s) => s.loadGraph);

  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => {
        const rfn = toReactFlowNode(n);
        rfn.selected = selectedNodeIds.includes(n.id);
        return rfn;
      }),
    [nodes, selectedNodeIds],
  );

  const rfEdges: Edge[] = useMemo(() => edges.map(toReactFlowEdge), [edges]);

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
          data-testid="canvas-toolbar"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 100,
            display: 'flex',
            gap: 6,
          }}
        >
          <button
            data-testid="export-mermaid-btn"
            onClick={() => {
              const text = graphToMermaid(nodes, edges);
              setMermaidModal({ mode: 'export', text });
            }}
            style={toolbarBtnStyle}
          >
            Export Mermaid
          </button>
          <button
            data-testid="import-mermaid-btn"
            onClick={() => setMermaidModal({ mode: 'import', text: '' })}
            style={toolbarBtnStyle}
          >
            Import Mermaid
          </button>
        </div>

        <ForkPanel />

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

        {pendingConnection && (
          <EdgeTypeSelector
            position={pendingConnection.position}
            connection={pendingConnection.connection}
            onSelect={handleEdgeTypeSelect}
            onCancel={() => setPendingConnection(null)}
          />
        )}
      </div>

      <PropertiesPanel />

      {showOverlay && <ShortcutOverlay onClose={() => setShowOverlay(false)} />}

      {/* Mermaid Modal */}
      {mermaidModal && (
        <div
          data-testid="mermaid-modal"
          role="dialog"
          aria-modal="true"
          aria-label={mermaidModal.mode === 'export' ? 'Export Mermaid' : 'Import Mermaid'}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setMermaidModal(null)}
        >
          <div
            style={{
              background: '#1A1A2E',
              borderRadius: 12,
              padding: 24,
              width: 520,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              border: '1px solid #2D2D3F',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0' }}>
              {mermaidModal.mode === 'export' ? 'Export Mermaid' : 'Import Mermaid'}
            </div>
            <textarea
              data-testid="mermaid-textarea"
              value={mermaidModal.text}
              onChange={(e) => setMermaidModal({ ...mermaidModal, text: e.target.value })}
              readOnly={mermaidModal.mode === 'export'}
              placeholder={mermaidModal.mode === 'import' ? 'Paste Mermaid flowchart here...' : undefined}
              style={{
                width: '100%',
                minHeight: 200,
                background: '#16162A',
                border: '1px solid #2D2D3F',
                borderRadius: 6,
                color: '#E2E8F0',
                fontFamily: 'monospace',
                fontSize: 12,
                padding: 12,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {mermaidModal.mode === 'export' && (
                <button
                  data-testid="mermaid-copy-btn"
                  onClick={() => navigator.clipboard.writeText(mermaidModal.text)}
                  style={toolbarBtnStyle}
                >
                  Copy
                </button>
              )}
              {mermaidModal.mode === 'import' && (
                <button
                  data-testid="mermaid-import-btn"
                  onClick={() => {
                    const { nodes: importedNodes, edges: importedEdges } = mermaidToGraph(mermaidModal.text);
                    pushSnapshot(nodes, edges);
                    loadGraph(importedNodes, importedEdges);
                    setMermaidModal(null);
                  }}
                  style={{ ...toolbarBtnStyle, backgroundColor: '#059669' }}
                >
                  Import
                </button>
              )}
              <button
                data-testid="mermaid-close-btn"
                onClick={() => setMermaidModal(null)}
                style={{ ...toolbarBtnStyle, backgroundColor: '#374151' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  backgroundColor: '#2563EB',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
};

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
