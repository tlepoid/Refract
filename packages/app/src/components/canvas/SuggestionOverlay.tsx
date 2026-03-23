'use client';

import { useMemo } from 'react';
import { NodeType, type GraphNode, type GraphEdge, EdgeType } from '@refract/shared';
import { useGraphStore } from '../../stores/graphStore';
import {
  useSuggestionStore,
  type SuggestionDiff,
} from '../../stores/suggestionStore';
import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type { BaseNodeData } from './BaseNode';

// Position ghost nodes relative to existing graph
function getGhostPosition(
  index: number,
  existingNodes: GraphNode[],
): { x: number; y: number } {
  const maxX = existingNodes.reduce((m, n) => Math.max(m, n.position.x), 0);
  const maxY = existingNodes.reduce((m, n) => Math.max(m, n.position.y), 0);
  return {
    x: maxX + 250,
    y: 100 + index * 150,
  };
}

export function useGhostElements(): {
  ghostNodes: Node[];
  ghostEdges: Edge[];
  removedNodeIds: Set<string>;
} {
  const suggestion = useSuggestionStore((s) => s.suggestion);
  const nodes = useGraphStore((s) => s.nodes);

  return useMemo(() => {
    if (!suggestion) {
      return { ghostNodes: [], ghostEdges: [], removedNodeIds: new Set() };
    }

    const ghostNodes: Node[] = [];
    const removedNodeIds = new Set<string>();
    const ghostEdges: Edge[] = [];

    // Process node diffs
    let addIndex = 0;
    for (const diff of suggestion.node_diff) {
      if (diff.action === 'add') {
        const pos = getGhostPosition(addIndex++, nodes);
        const ghostId = `ghost-${diff.node_id}`;
        const ghostNode: GraphNode = {
          id: ghostId,
          type: NodeType.LLM, // default type for ghost nodes
          label: diff.details || 'New Node',
          position: pos,
          config: {},
          pattern_id: null,
          metadata: { isGhost: true },
        };
        ghostNodes.push({
          id: ghostId,
          type: ghostNode.type,
          position: pos,
          data: { graphNode: ghostNode, isGhost: true } as BaseNodeData & { isGhost: boolean },
          style: { opacity: 0.4 },
          selectable: false,
          draggable: false,
        });
      } else if (diff.action === 'remove') {
        removedNodeIds.add(diff.node_id);
      }
    }

    // Process edge diffs
    for (const diff of suggestion.edge_diff) {
      if (diff.action === 'add') {
        ghostEdges.push({
          id: `ghost-edge-${diff.edge_id}`,
          source: diff.edge_id.split('->')[0] ?? '',
          target: diff.edge_id.split('->')[1] ?? '',
          type: EdgeType.DATA_FLOW,
          style: { opacity: 0.4, strokeDasharray: '6 3' },
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        });
      }
    }

    return { ghostNodes, ghostEdges, removedNodeIds };
  }, [suggestion, nodes]);
}

export function SuggestionActions() {
  const suggestion = useSuggestionStore((s) => s.suggestion);
  const clearSuggestion = useSuggestionStore((s) => s.clearSuggestion);
  const addNode = useGraphStore((s) => s.addNode);
  const removeNode = useGraphStore((s) => s.removeNode);
  const nodes = useGraphStore((s) => s.nodes);

  if (!suggestion) return null;

  const handleAccept = () => {
    // Apply node diffs
    for (const diff of suggestion.node_diff) {
      if (diff.action === 'add') {
        const maxX = nodes.reduce((m, n) => Math.max(m, n.position.x), 0);
        addNode({
          id: crypto.randomUUID(),
          type: NodeType.LLM,
          label: diff.details || 'New Node',
          position: { x: maxX + 250, y: 100 },
          config: {},
          pattern_id: null,
          metadata: {},
        });
      } else if (diff.action === 'remove') {
        removeNode(diff.node_id);
      }
    }
    clearSuggestion();
  };

  const handleDismiss = () => {
    clearSuggestion();
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 1000,
        display: 'flex',
        gap: 8,
        padding: 8,
        background: '#1A1A2E',
        borderRadius: 8,
        border: '1px solid #2D2D3F',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ fontSize: 12, color: '#94A3B8', marginRight: 8, alignSelf: 'center' }}>
        {suggestion.description}
      </div>
      <button
        onClick={handleAccept}
        style={{
          padding: '6px 14px',
          background: '#4ADE80',
          color: '#0F0F1A',
          border: 'none',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Accept
      </button>
      <button
        onClick={handleDismiss}
        style={{
          padding: '6px 14px',
          background: '#2D2D3F',
          color: '#94A3B8',
          border: 'none',
          borderRadius: 6,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
