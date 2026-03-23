'use client';

import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from '../BaseNode';

export function MemoryNode(props: NodeProps) {
  const graphNode = (props.data as BaseNodeData).graphNode;
  const memType = graphNode.config.type || 'buffer';

  return <BaseNode nodeProps={props} subtitle={memType} />;
}
