import type { Edge, Connection } from '@xyflow/react';
import type { GraphNode } from '@refract/shared';

export interface ValidationContext {
  nodes: GraphNode[];
  edges: Edge[];
}

export function isValidConnection(
  connection: Edge | Connection,
  context: ValidationContext,
): boolean {
  const { source, target, sourceHandle, targetHandle } = connection;

  // Rule 1: No self-connections
  if (source === target) return false;

  // Rule 2: source must have a sourceHandle and target must have a targetHandle
  if (!sourceHandle || !targetHandle) return false;

  // Rule 3: No duplicate edges (same source_handle + target_handle pair)
  const isDuplicate = context.edges.some(
    (e) =>
      e.source === source &&
      e.target === target &&
      e.sourceHandle === sourceHandle &&
      e.targetHandle === targetHandle,
  );
  if (isDuplicate) return false;

  // Rule 4: tool_calls output can only connect to tool_call input
  if (sourceHandle === 'tool_calls' && targetHandle !== 'tool_call') return false;
  if (targetHandle === 'tool_call' && sourceHandle !== 'tool_calls') return false;

  // Rule 5: read_result output can only connect to context input
  if (sourceHandle === 'read_result' && targetHandle !== 'context') return false;
  if (targetHandle === 'context' && sourceHandle === 'read_result') {
    // This is fine, allow it
  }

  return true;
}
