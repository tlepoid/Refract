'use client';

import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from '../BaseNode';

export function HumanInLoopNode(props: NodeProps) {
  const graphNode = (props.data as BaseNodeData).graphNode;
  const approvalType = graphNode.config.approval_type || 'binary';

  return <BaseNode nodeProps={props} subtitle={approvalType} />;
}
