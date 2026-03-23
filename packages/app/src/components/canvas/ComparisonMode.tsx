'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnNodesChange,
  MarkerType,
} from '@xyflow/react';
import { evaluateGraph, type GraphNode, type GraphEdge, type Scorecard } from '@refract/shared';
import { useGraphStore } from '../../stores/graphStore';
import { useComparisonStore } from '../../stores/comparisonStore';
import { getReactFlowNodeTypes } from './nodeRegistry';
import { edgeTypes } from './edges/edgeTypes';
import { streamSSE } from '../../hooks/useSSE';
import Markdown from 'react-markdown';
import type { BaseNodeData } from './BaseNode';

const rfNodeTypes = getReactFlowNodeTypes();
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

function toRFNode(n: GraphNode): Node {
  return {
    id: n.id,
    type: n.type,
    position: n.position,
    data: { graphNode: n } as BaseNodeData,
  };
}

function toRFEdge(e: GraphEdge): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.source_handle,
    targetHandle: e.target_handle,
    type: e.type,
    label: e.label ?? undefined,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  };
}

function ScorecardView({ scorecard, label }: { scorecard: Scorecard | null; label: string }) {
  if (!scorecard) return null;
  return (
    <div style={{ padding: 8, fontSize: 11, color: '#CBD5E1' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#94A3B8', textTransform: 'uppercase' }}>{label}</div>
      <div>Cost: ${scorecard.cost.median.toFixed(4)}</div>
      <div>Latency p50: {scorecard.latency_p50_ms}ms</div>
      <div>Latency p99: {scorecard.latency_p99_ms}ms</div>
      <div>Reliability: {(scorecard.reliability * 100).toFixed(1)}%</div>
      <div>Complexity: {scorecard.complexity}</div>
    </div>
  );
}

function DiffPanel({ left, right }: { left: Scorecard | null; right: Scorecard | null }) {
  if (!left || !right) return null;

  const metrics = [
    { label: 'Cost', lv: left.cost.median, rv: right.cost.median, unit: 'USD', inverse: true },
    { label: 'Latency p50', lv: left.latency_p50_ms, rv: right.latency_p50_ms, unit: 'ms', inverse: true },
    { label: 'Latency p99', lv: left.latency_p99_ms, rv: right.latency_p99_ms, unit: 'ms', inverse: true },
    { label: 'Reliability', lv: left.reliability, rv: right.reliability, unit: '%', inverse: false },
    { label: 'Complexity', lv: left.complexity, rv: right.complexity, unit: '', inverse: true },
  ];

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid #2D2D3F' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase' }}>
        Diff
      </div>
      {metrics.map((m) => {
        const delta = m.rv - m.lv;
        const isBetter = m.inverse ? delta < 0 : delta > 0;
        const isWorse = m.inverse ? delta > 0 : delta < 0;
        const color = isBetter ? '#4ADE80' : isWorse ? '#F87171' : '#94A3B8';
        const arrow = delta > 0 ? '\u2191' : delta < 0 ? '\u2193' : '=';
        const display = m.label === 'Reliability'
          ? `${(delta * 100).toFixed(2)}%`
          : delta.toFixed(4);

        return (
          <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
            <span style={{ color: '#94A3B8' }}>{m.label}</span>
            <span style={{ color, fontWeight: 600 }}>
              {arrow} {display} {m.unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ReadOnlyCanvas({ nodes, edges, label }: { nodes: GraphNode[]; edges: GraphEdge[]; label: string }) {
  const rfNodes = useMemo(() => nodes.map(toRFNode), [nodes]);
  const rfEdges = useMemo(() => edges.map(toRFEdge), [edges]);

  return (
    <div style={{ flex: 1, position: 'relative', borderRight: '1px solid #2D2D3F' }}>
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 10,
          background: '#1A1A2E',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          color: '#94A3B8',
          border: '1px solid #2D2D3F',
        }}
      >
        {label}
      </div>
      <ReactFlowProvider>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={rfNodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          style={{ background: '#0F0F1A' }}
        >
          <Background color="#1E1E2E" gap={20} />
          <Controls
            style={{ background: '#1A1A2E', borderRadius: 8, border: '1px solid #2D2D3F' }}
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

function EditableCanvas({
  nodes,
  edges,
  label,
  onChange,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  label: string;
  onChange: (nodes: GraphNode[], edges: GraphEdge[]) => void;
}) {
  const rfNodes = useMemo(() => nodes.map(toRFNode), [nodes]);
  const rfEdges = useMemo(() => edges.map(toRFEdge), [edges]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      let updated = [...nodes];
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updated = updated.map((n) =>
            n.id === change.id ? { ...n, position: change.position! } : n,
          );
        }
      }
      if (updated !== nodes) {
        onChange(updated, edges);
      }
    },
    [nodes, edges, onChange],
  );

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 10,
          background: '#1A1A2E',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          color: '#60A5FA',
          border: '1px solid #3B82F6',
        }}
      >
        {label} (editable)
      </div>
      <ReactFlowProvider>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={rfNodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          fitView
          style={{ background: '#0F0F1A' }}
        >
          <Background color="#1E1E2E" gap={20} />
          <Controls
            style={{ background: '#1A1A2E', borderRadius: 8, border: '1px solid #2D2D3F' }}
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export function ComparisonMode() {
  const {
    leftNodes, leftEdges, rightNodes, rightEdges,
    leftScorecard, rightScorecard, narrative, narrativeLoading,
  } = useComparisonStore();
  const exitComparison = useComparisonStore((s) => s.exitComparison);
  const updateRight = useComparisonStore((s) => s.updateRight);
  const setLeftScorecard = useComparisonStore((s) => s.setLeftScorecard);
  const setRightScorecard = useComparisonStore((s) => s.setRightScorecard);
  const setNarrative = useComparisonStore((s) => s.setNarrative);
  const setNarrativeLoading = useComparisonStore((s) => s.setNarrativeLoading);
  const loadGraph = useGraphStore((s) => s.loadGraph);

  const abortRef = useRef<AbortController | null>(null);

  // Compute scorecards
  useEffect(() => {
    const profiles = new Map();
    setLeftScorecard(evaluateGraph(leftNodes, leftEdges, profiles));
    setRightScorecard(evaluateGraph(rightNodes, rightEdges, profiles));
  }, [leftNodes, leftEdges, rightNodes, rightEdges, setLeftScorecard, setRightScorecard]);

  const handleExit = useCallback(
    (keep: 'left' | 'right') => {
      const result = exitComparison(keep);
      loadGraph(result.nodes, result.edges);
    },
    [exitComparison, loadGraph],
  );

  const handleCompare = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setNarrativeLoading(true);
    setNarrative('');
    let text = '';

    streamSSE(
      `${SERVER_URL}/api/analyze`,
      {
        graph: { nodes: leftNodes, edges: leftEdges },
        message: `Compare these two agent architectures:

DESIGN A (original): ${JSON.stringify({ nodes: leftNodes.length, edges: leftEdges.length })}
DESIGN B (fork): ${JSON.stringify({ nodes: rightNodes.length, edges: rightEdges.length })}

Second graph: ${JSON.stringify({ nodes: rightNodes, edges: rightEdges })}

Provide a narrative comparison of the two designs: which is better for cost, latency, reliability, and when you'd choose one over the other.`,
      },
      (event) => {
        if (event.type === 'text') {
          text += event.content ?? '';
          setNarrative(text);
        }
        if (event.type === 'done' || event.type === 'error') {
          setNarrativeLoading(false);
        }
      },
      controller.signal,
    ).catch(() => setNarrativeLoading(false));
  }, [leftNodes, leftEdges, rightNodes, rightEdges, setNarrative, setNarrativeLoading]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: '#0F0F1A' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: '#1A1A2E',
          borderBottom: '1px solid #2D2D3F',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0' }}>
          Comparison Mode
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleCompare} disabled={narrativeLoading} style={compareButtonStyle}>
            {narrativeLoading ? 'Comparing...' : 'AI Compare'}
          </button>
          <button onClick={() => handleExit('left')} style={exitButtonStyle}>
            Keep Original
          </button>
          <button onClick={() => handleExit('right')} style={exitButtonStyle}>
            Keep Fork
          </button>
        </div>
      </div>

      {/* Canvases */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <ReadOnlyCanvas nodes={leftNodes} edges={leftEdges} label="Original" />
        <EditableCanvas
          nodes={rightNodes}
          edges={rightEdges}
          label="Fork"
          onChange={updateRight}
        />
      </div>

      {/* Bottom panel: scorecards + diff + narrative */}
      <div
        style={{
          display: 'flex',
          background: '#1A1A2E',
          borderTop: '1px solid #2D2D3F',
          flexShrink: 0,
          maxHeight: 200,
          overflowY: 'auto',
        }}
      >
        <ScorecardView scorecard={leftScorecard} label="Original" />
        <div style={{ width: 1, background: '#2D2D3F' }} />
        <DiffPanel left={leftScorecard} right={rightScorecard} />
        <div style={{ width: 1, background: '#2D2D3F' }} />
        <ScorecardView scorecard={rightScorecard} label="Fork" />
        <div style={{ width: 1, background: '#2D2D3F' }} />
        <div style={{ flex: 1, padding: 8, fontSize: 12, color: '#CBD5E1', overflowY: 'auto' }}>
          {narrative ? (
            <Markdown>{narrative}</Markdown>
          ) : (
            <div style={{ color: '#64748B', fontSize: 12 }}>
              Click &quot;AI Compare&quot; to generate a comparison narrative
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const compareButtonStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: '#3B82F6',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

const exitButtonStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: '#2D2D3F',
  color: '#E2E8F0',
  border: 'none',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};
