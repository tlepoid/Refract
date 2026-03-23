'use client';

import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from '../BaseNode';

export function PlannerNode(props: NodeProps) {
  const graphNode = (props.data as BaseNodeData).graphNode;
  const pattern = graphNode.config.pattern || 'react';

  return <BaseNode nodeProps={props} subtitle={pattern} />;
}
