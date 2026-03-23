// ── Enums ──
// Extracted into a standalone module to avoid circular-dependency issues:
// mermaid.ts needs the runtime enum values at module initialisation time,
// and it cannot safely import them from index.ts which re-exports mermaid.ts.

export enum NodeType {
  LLM = 'llm',
  TOOL = 'tool',
  MEMORY = 'memory',
  ROUTER = 'router',
  PLANNER = 'planner',
  GUARDRAIL = 'guardrail',
  HUMAN_IN_LOOP = 'human_in_loop',
  INPUT = 'input',
  OUTPUT = 'output',
}

export enum EdgeType {
  DATA_FLOW = 'data_flow',
  CONTROL_FLOW = 'control_flow',
  TOOL_CALL = 'tool_call',
  MEMORY_OP = 'memory_op',
}
