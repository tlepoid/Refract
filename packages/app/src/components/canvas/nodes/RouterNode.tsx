'use client';

import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from '../BaseNode';

export function RouterNode(props: NodeProps) {
  const graphNode = (props.data as BaseNodeData).graphNode;
  const strategy = graphNode.config.strategy || 'llm';

  return <BaseNode nodeProps={props} subtitle={strategy} />;
}
