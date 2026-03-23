import { EdgeType } from '@refract/shared';
import { DataFlowEdge } from './DataFlowEdge';
import { ControlFlowEdge } from './ControlFlowEdge';
import { ToolCallEdge } from './ToolCallEdge';
import { MemoryOpEdge } from './MemoryOpEdge';

export const edgeTypes = {
  [EdgeType.DATA_FLOW]: DataFlowEdge,
  [EdgeType.CONTROL_FLOW]: ControlFlowEdge,
  [EdgeType.TOOL_CALL]: ToolCallEdge,
  [EdgeType.MEMORY_OP]: MemoryOpEdge,
};
