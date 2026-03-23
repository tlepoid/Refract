'use client';

import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from '../BaseNode';

export function ToolNode(props: NodeProps) {
  const graphNode = (props.data as BaseNodeData).graphNode;
  const name = graphNode.config.name || 'unnamed';

  return <BaseNode nodeProps={props} subtitle={name} />;
}
