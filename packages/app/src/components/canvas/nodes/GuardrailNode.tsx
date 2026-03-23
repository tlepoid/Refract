'use client';

import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from '../BaseNode';

export function GuardrailNode(props: NodeProps) {
  const graphNode = (props.data as BaseNodeData).graphNode;
  const action = graphNode.config.action || 'block';

  return <BaseNode nodeProps={props} subtitle={action} />;
}
