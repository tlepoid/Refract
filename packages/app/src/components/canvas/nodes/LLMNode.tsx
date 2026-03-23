'use client';

import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from '../BaseNode';

export function LLMNode(props: NodeProps) {
  const graphNode = (props.data as BaseNodeData).graphNode;
  const model = graphNode.config.model || 'claude-sonnet-4';

  return <BaseNode nodeProps={props} subtitle={model} />;
}
