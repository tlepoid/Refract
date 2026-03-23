'use client';

import type { NodeProps } from '@xyflow/react';
import { BaseNode } from '../BaseNode';

export function OutputNode(props: NodeProps) {
  return <BaseNode nodeProps={props} />;
}
