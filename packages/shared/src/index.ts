export { serializeGraphForLLM, identifyPatterns } from './serializer';
export { evaluateGraph } from './eval';
export { graphToMermaid, mermaidToGraph } from './mermaid';
export * from './types';

import { NodeType } from './types';
import type { HandleDef } from './types';

export const NODE_HANDLES: Record<NodeType, HandleDef> = {
  [NodeType.LLM]: {
    inputs: ['prompt', 'context'],
    outputs: ['response', 'tool_calls'],
  },
  [NodeType.TOOL]: {
    inputs: ['tool_call'],
    outputs: ['tool_result'],
  },
  [NodeType.MEMORY]: {
    inputs: ['write_op', 'query'],
    outputs: ['read_result'],
  },
  [NodeType.ROUTER]: {
    inputs: ['input'],
    outputs: ['routed_output'],
  },
  [NodeType.PLANNER]: {
    inputs: ['goal'],
    outputs: ['plan', 'step_results'],
  },
  [NodeType.GUARDRAIL]: {
    inputs: ['content'],
    outputs: ['validated', 'blocked'],
  },
  [NodeType.HUMAN_IN_LOOP]: {
    inputs: ['request'],
    outputs: ['approval', 'feedback'],
  },
  [NodeType.INPUT]: {
    inputs: [],
    outputs: ['output'],
  },
  [NodeType.OUTPUT]: {
    inputs: ['input'],
    outputs: [],
  },
};
