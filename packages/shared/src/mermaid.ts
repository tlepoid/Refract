import { NodeType, EdgeType } from './enums.js';
import type { GraphNode, GraphEdge } from './index.js';

// ── Default configs per node type ──

const DEFAULT_CONFIGS: Record<NodeType, Record<string, unknown>> = {
  [NodeType.LLM]: { model: 'claude-sonnet-4', temperature: 0.7, max_tokens: 4096, system_prompt: '' },
  [NodeType.TOOL]: { name: '', description: '', input_schema: {}, timeout_ms: 30000 },
  [NodeType.MEMORY]: { type: 'buffer', capacity: 100, ttl: 3600 },
  [NodeType.ROUTER]: { strategy: 'llm', routes: [] },
  [NodeType.PLANNER]: { pattern: 'react', max_steps: 10 },
  [NodeType.GUARDRAIL]: { type: 'input', rules: [], action: 'warn' },
  [NodeType.HUMAN_IN_LOOP]: { approval_type: 'binary', timeout: 300, escalation_path: '' },
  [NodeType.INPUT]: { description: '' },
  [NodeType.OUTPUT]: { description: '' },
};

// ── Class definition colors per node type ──

const NODE_COLORS: Record<NodeType, string> = {
  [NodeType.LLM]: '#6366f1',
  [NodeType.TOOL]: '#f59e0b',
  [NodeType.MEMORY]: '#10b981',
  [NodeType.ROUTER]: '#ec4899',
  [NodeType.PLANNER]: '#8b5cf6',
  [NodeType.GUARDRAIL]: '#ef4444',
  [NodeType.HUMAN_IN_LOOP]: '#06b6d4',
  [NodeType.INPUT]: '#22c55e',
  [NodeType.OUTPUT]: '#f97316',
};

// ── Node shape wrappers by type ──

function wrapNodeShape(id: string, label: string, type: NodeType): string {
  const displayLabel = `${label} (${type})`;
  switch (type) {
    case NodeType.INPUT:
      return `${id}(("${displayLabel}"))`;
    case NodeType.OUTPUT:
      return `${id}[/"${displayLabel}"/]`;
    case NodeType.ROUTER:
      return `${id}{"${displayLabel}"}`;
    case NodeType.GUARDRAIL:
    case NodeType.HUMAN_IN_LOOP:
      return `${id}[["${displayLabel}"]]`;
    default:
      return `${id}["${displayLabel}"]`;
  }
}

// ── Export: graph -> Mermaid ──

/**
 * Converts a graph of nodes and edges into a Mermaid flowchart string.
 *
 * Node shapes are determined by their type, labels include a type suffix,
 * and classDef directives provide color coding per node type.
 */
export function graphToMermaid(nodes: GraphNode[], edges: GraphEdge[]): string {
  const lines: string[] = ['graph LR'];

  // Node definitions
  for (const node of nodes) {
    lines.push(`  ${wrapNodeShape(node.id, node.label, node.type)}`);
  }

  // Edge definitions
  for (const edge of edges) {
    lines.push(`  ${edge.source} -->|${edge.type}| ${edge.target}`);
  }

  // Collect which types are actually used so we only emit relevant classDefs
  const usedTypes = new Set(nodes.map((n) => n.type));

  for (const type of usedTypes) {
    const color = NODE_COLORS[type];
    lines.push(`  classDef ${type} fill:${color},stroke:#333,color:#fff`);
  }

  // Apply classes to nodes
  for (const node of nodes) {
    lines.push(`  class ${node.id} ${node.type}`);
  }

  return lines.join('\n');
}

// ── Import: Mermaid -> graph ──

// Matches node definitions produced by graphToMermaid.
// Captures: id, label (including type suffix like "My LLM (llm)")
const NODE_REGEX = /^\s*(\w+)(?:\(\("([^"]+)"\)\)|\[\/"([^"]+)"\/\]|\{"([^"]+)"\}|\[\["([^"]+)"\]\]|\["([^"]+)"\])/;

// Matches edge definitions: `source -->|edgeType| target`
const EDGE_REGEX = /^\s*(\w+)\s+-->\|([^|]+)\|\s+(\w+)/;

// Extracts the type suffix from a label like "My LLM (llm)"
const LABEL_TYPE_REGEX = /^(.+?)\s+\((\w+)\)$/;

/**
 * Parses a Mermaid flowchart string (produced by graphToMermaid) back into
 * GraphNode and GraphEdge arrays.
 *
 * Only handles our own export format -- not arbitrary Mermaid syntax.
 * Unknown node types default to NodeType.LLM.
 * Nodes are assigned grid positions in 4 columns with 200px spacing.
 */
export function mermaidToGraph(mermaid: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const lines = mermaid.split('\n');
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeTypeValues = new Set<string>(Object.values(NodeType));

  for (const line of lines) {
    // Try edge first -- edge regex is more specific and won't conflict
    const edgeMatch = line.match(EDGE_REGEX);
    if (edgeMatch) {
      const [, source, edgeTypeRaw, target] = edgeMatch;
      const edgeType = Object.values(EdgeType).includes(edgeTypeRaw as EdgeType)
        ? (edgeTypeRaw as EdgeType)
        : EdgeType.DATA_FLOW;

      edges.push({
        id: `e-${source}-${target}`,
        source,
        target,
        source_handle: 'output',
        target_handle: 'input',
        type: edgeType,
        label: null,
      });
      continue;
    }

    // Try node definition
    const nodeMatch = line.match(NODE_REGEX);
    if (nodeMatch) {
      const id = nodeMatch[1];
      // The label lands in one of the capture groups depending on shape
      const rawLabel = nodeMatch[2] ?? nodeMatch[3] ?? nodeMatch[4] ?? nodeMatch[5] ?? nodeMatch[6];
      if (!rawLabel) continue;

      // Extract type from the "(type)" suffix in the label
      let label = rawLabel;
      let nodeType = NodeType.LLM; // default fallback

      const labelTypeMatch = rawLabel.match(LABEL_TYPE_REGEX);
      if (labelTypeMatch) {
        label = labelTypeMatch[1];
        const parsedType = labelTypeMatch[2];
        if (nodeTypeValues.has(parsedType)) {
          nodeType = parsedType as NodeType;
        }
      }

      // Grid layout: 4 columns, 200px spacing
      const col = nodes.length % 4;
      const row = Math.floor(nodes.length / 4);

      nodes.push({
        id,
        type: nodeType,
        label,
        position: { x: col * 200, y: row * 200 },
        config: { ...DEFAULT_CONFIGS[nodeType] },
        pattern_id: null,
        metadata: {},
      });
    }
  }

  return { nodes, edges };
}
