// ── Enums (re-exported from dedicated module to avoid circular-dependency issues) ──

import { NodeType, EdgeType } from './enums';
export { NodeType, EdgeType } from './enums';

// ── Per-node config interfaces ──

export interface LLMConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
}

export interface ToolConfig {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  timeout_ms: number;
}

export interface MemoryConfig {
  type: 'buffer' | 'vector' | 'kg';
  capacity: number;
  ttl: number;
}

export interface RouterConfig {
  strategy: 'llm' | 'rule' | 'semantic';
  routes: string[];
}

export interface PlannerConfig {
  pattern: 'react' | 'plan-execute' | 'reflection';
  max_steps: number;
}

export interface GuardrailConfig {
  type: 'input' | 'output';
  rules: string[];
  action: 'block' | 'warn' | 'log';
}

export interface HumanInLoopConfig {
  approval_type: 'binary' | 'freetext';
  timeout: number;
  escalation_path: string;
}

export interface InputConfig {
  description: string;
}

export interface OutputConfig {
  description: string;
}

export type NodeConfig =
  | LLMConfig
  | ToolConfig
  | MemoryConfig
  | RouterConfig
  | PlannerConfig
  | GuardrailConfig
  | HumanInLoopConfig
  | InputConfig
  | OutputConfig;

// ── Graph model interfaces ──

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  pattern_id: string | null;
  metadata: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  source_handle: string;
  target_handle: string;
  type: EdgeType;
  label: string | null;
}

export interface CanvasDocument {
  id: string;
  name: string;
  team_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  created_at: string;
  updated_at: string;
}

// ── Comment & decision types ──

export interface CommentMessage {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface CommentThread {
  id: string;
  anchor: { type: 'node'; id: string };
  status: 'open' | 'resolved' | 'wontfix';
  messages: CommentMessage[];
}

export interface DecisionRecord {
  id: string;
  timestamp: string;
  author: string;
  thread_id: string;
  summary: string;
  rationale: string;
  node_ids: string[];
}

// ── Handle definitions ──

export interface HandleDef {
  inputs: string[];
  outputs: string[];
}

// ── Pattern & Eval interfaces ──

export interface Pattern {
  id: string;
  name: string;
  category: 'orchestration' | 'reasoning' | 'memory' | 'safety';
  description: string;
  when_to_use: string[];
  when_not_to_use: string[];
  trade_offs: {
    token_cost: 'low' | 'medium' | 'high' | 'variable';
    latency: 'low' | 'medium' | 'high' | 'variable';
    reliability: 'low' | 'medium' | 'high' | 'variable';
    complexity: 'low' | 'medium' | 'high' | 'variable';
    adaptability: 'low' | 'medium' | 'high' | 'variable';
  };
  failure_modes: string[];
  compatible_with: string[];
  conflicts_with: string[];
  example_graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  eval_profile: {
    tokens_per_step: [number, number, number];
    steps_per_task: [number, number, number];
    p50_latency_ms: number;
    p99_latency_ms: number;
    failure_rate: number;
  };
}

export interface Scorecard {
  cost: { min: number; median: number; max: number; currency: 'USD' };
  latency_p50_ms: number;
  latency_p99_ms: number;
  reliability: number;
  complexity: number;
}

export interface PatternMatch {
  patternId: string;
  confidence: number;
  involvedNodeIds: string[];
}

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

// ── Re-exports (placed after enums/constants to avoid circular-dependency issues) ──

export { serializeGraphForLLM, identifyPatterns } from './serializer';
export { evaluateGraph } from './eval';
export { graphToMermaid, mermaidToGraph } from './mermaid';
