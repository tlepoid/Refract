import { NodeType } from '@refract/shared';
import type { ComponentType } from 'react';
import type { NodeProps } from '@xyflow/react';
import { LLMNode } from './nodes/LLMNode';
import { ToolNode } from './nodes/ToolNode';
import { MemoryNode } from './nodes/MemoryNode';
import { RouterNode } from './nodes/RouterNode';
import { PlannerNode } from './nodes/PlannerNode';
import { GuardrailNode } from './nodes/GuardrailNode';
import { HumanInLoopNode } from './nodes/HumanInLoopNode';
import { InputNode } from './nodes/InputNode';
import { OutputNode } from './nodes/OutputNode';

export interface NodeTypeRegistration {
  component: ComponentType<NodeProps>;
  color: string;
  icon: string;
  defaultConfig: Record<string, any>;
  description: string;
}

export const nodeRegistry: Record<NodeType, NodeTypeRegistration> = {
  [NodeType.LLM]: {
    component: LLMNode,
    color: '#7C3AED',
    icon: 'brain',
    defaultConfig: {
      model: 'claude-sonnet-4',
      temperature: 0.7,
      max_tokens: 4096,
      system_prompt: '',
    },
    description: 'Large language model inference',
  },
  [NodeType.TOOL]: {
    component: ToolNode,
    color: '#2563EB',
    icon: 'wrench',
    defaultConfig: {
      name: '',
      description: '',
      input_schema: {},
      timeout_ms: 30000,
    },
    description: 'External tool or API call',
  },
  [NodeType.MEMORY]: {
    component: MemoryNode,
    color: '#0D9488',
    icon: 'database',
    defaultConfig: {
      type: 'buffer',
      capacity: 100,
      ttl: 3600,
    },
    description: 'Persistent or session memory',
  },
  [NodeType.ROUTER]: {
    component: RouterNode,
    color: '#D97706',
    icon: 'split',
    defaultConfig: {
      strategy: 'llm',
      routes: [],
    },
    description: 'Route messages by condition',
  },
  [NodeType.PLANNER]: {
    component: PlannerNode,
    color: '#E85D4A',
    icon: 'list',
    defaultConfig: {
      pattern: 'react',
      max_steps: 10,
    },
    description: 'Multi-step planning and execution',
  },
  [NodeType.GUARDRAIL]: {
    component: GuardrailNode,
    color: '#DC2626',
    icon: 'shield',
    defaultConfig: {
      type: 'input',
      rules: [],
      action: 'block',
    },
    description: 'Content safety and validation',
  },
  [NodeType.HUMAN_IN_LOOP]: {
    component: HumanInLoopNode,
    color: '#DB2777',
    icon: 'user',
    defaultConfig: {
      approval_type: 'binary',
      timeout: 300,
      escalation_path: '',
    },
    description: 'Human review and approval',
  },
  [NodeType.INPUT]: {
    component: InputNode,
    color: '#6B7280',
    icon: 'arrow-right',
    defaultConfig: {
      description: '',
    },
    description: 'Graph input entry point',
  },
  [NodeType.OUTPUT]: {
    component: OutputNode,
    color: '#6B7280',
    icon: 'arrow-left',
    defaultConfig: {
      description: '',
    },
    description: 'Graph output exit point',
  },
};

/** Map for ReactFlow's nodeTypes prop */
export function getReactFlowNodeTypes(): Record<string, ComponentType<NodeProps>> {
  const types: Record<string, ComponentType<NodeProps>> = {};
  for (const [key, reg] of Object.entries(nodeRegistry)) {
    types[key] = reg.component;
  }
  return types;
}
