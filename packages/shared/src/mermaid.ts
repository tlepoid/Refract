import type { GraphNode, GraphEdge } from './types';
import { NodeType, EdgeType } from './types';

// ── Export: Graph → Mermaid ──

const NODE_SHAPE: Record<string, (id: string, label: string) => string> = {
  [NodeType.LLM]: (id, label) => `${id}("${label}")`,
  [NodeType.TOOL]: (id, label) => `${id}[["${label}"]]`,
  [NodeType.MEMORY]: (id, label) => `${id}[("${label}")]`,
  [NodeType.ROUTER]: (id, label) => `${id}{"${label}"}`,
  [NodeType.PLANNER]: (id, label) => `${id}(["${label}"])`,
  [NodeType.GUARDRAIL]: (id, label) => `${id}[/"${label}"/]`,
  [NodeType.HUMAN_IN_LOOP]: (id, label) => `${id}>"${label}"]`,
  [NodeType.INPUT]: (id, label) => `${id}([["${label}"]])`,
  [NodeType.OUTPUT]: (id, label) => `${id}([["${label}"]])`,
};

const EDGE_LINK: Record<string, string> = {
  [EdgeType.DATA_FLOW]: '-->',
  [EdgeType.CONTROL_FLOW]: '-.->',
  [EdgeType.TOOL_CALL]: '==>',
  [EdgeType.MEMORY_OP]: '-.->', // mermaid doesn't have ~~~ for links, use dotted
};

export function graphToMermaid(nodes: GraphNode[], edges: GraphEdge[]): string {
  const lines: string[] = ['flowchart TD'];

  // Sanitize node IDs for Mermaid (replace hyphens, keep alphanumeric)
  const idMap = new Map<string, string>();
  nodes.forEach((n, i) => {
    const safeId = `n${i}`;
    idMap.set(n.id, safeId);
  });

  // Nodes
  for (const node of nodes) {
    const safeId = idMap.get(node.id)!;
    const shapeFn = NODE_SHAPE[node.type] ?? NODE_SHAPE[NodeType.LLM];
    const escapedLabel = node.label.replace(/"/g, "'");
    lines.push(`  ${shapeFn(safeId, escapedLabel)}`);
  }

  // Edges
  for (const edge of edges) {
    const src = idMap.get(edge.source);
    const tgt = idMap.get(edge.target);
    if (!src || !tgt) continue;

    const link = EDGE_LINK[edge.type] ?? '-->';
    if (edge.label) {
      const escapedLabel = edge.label.replace(/"/g, "'");
      // Mermaid labeled edge syntax: A -->|label| B
      const linkBase = link.replace('>', '');
      lines.push(`  ${src} ${linkBase}|${escapedLabel}|> ${tgt}`);
    } else {
      lines.push(`  ${src} ${link} ${tgt}`);
    }
  }

  return lines.join('\n');
}

// ── Import: Mermaid → Graph ──

// Reverse shape detection
const SHAPE_TO_TYPE: [RegExp, NodeType][] = [
  [/^\[\[".*"\]\]$/, NodeType.TOOL],        // [["label"]]
  [/^\[\(".*"\)\]$/, NodeType.MEMORY],      // [("label")]
  [/^\{".*"\}$/, NodeType.ROUTER],          // {"label"}
  [/^\(\[".*"\]\)$/, NodeType.PLANNER],     // (["label"])
  [/^\[\/".*"\/\]$/, NodeType.GUARDRAIL],   // [/"label"/]
  [/^>".*"\]$/, NodeType.HUMAN_IN_LOOP],    // >"label"]
  [/^\(\[\[".*"\]\]\)$/, NodeType.INPUT],   // ([["label"]])
  [/^\(".*"\)$/, NodeType.LLM],            // ("label")
];

const LINK_TO_TYPE: [RegExp, EdgeType][] = [
  [/==+>/, EdgeType.TOOL_CALL],
  [/-.+->/, EdgeType.CONTROL_FLOW],
  [/--+>/, EdgeType.DATA_FLOW],
];

function inferNodeType(shapePart: string): NodeType {
  for (const [regex, type] of SHAPE_TO_TYPE) {
    if (regex.test(shapePart)) return type;
  }
  return NodeType.LLM; // graceful degradation
}

function inferEdgeType(linkPart: string): EdgeType {
  for (const [regex, type] of LINK_TO_TYPE) {
    if (regex.test(linkPart)) return type;
  }
  return EdgeType.DATA_FLOW;
}

function extractLabel(shapePart: string): string {
  const match = shapePart.match(/"([^"]*)"/);
  return match ? match[1] : shapePart;
}

export function mermaidToGraph(mermaidText: string): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const lines = mermaidText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%') && !l.match(/^flowchart\s/i) && !l.match(/^graph\s/i));

  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // Parse edge lines: A -->|label| B  or  A --> B
  const edgePattern = /^(\w+)\s+([-=.]+(?:\|[^|]*\|)?[->]+)\s+(\w+)$/;
  // Parse node definitions: id("label")  or  id{label}  etc.
  const nodeDefPattern = /^(\w+)(.+)$/;

  for (const line of lines) {
    const edgeMatch = line.match(edgePattern);
    if (edgeMatch) {
      const [, srcId, linkPart, tgtId] = edgeMatch;

      // Ensure source and target exist in nodeMap
      if (!nodeMap.has(srcId)) {
        nodeMap.set(srcId, makeDefaultNode(srcId));
      }
      if (!nodeMap.has(tgtId)) {
        nodeMap.set(tgtId, makeDefaultNode(tgtId));
      }

      // Extract label from link
      const labelMatch = linkPart.match(/\|([^|]*)\|/);
      const edgeLabel = labelMatch ? labelMatch[1] : null;

      edges.push({
        id: crypto.randomUUID(),
        source: srcId,
        target: tgtId,
        source_handle: 'output',
        target_handle: 'input',
        type: inferEdgeType(linkPart),
        label: edgeLabel,
      });
      continue;
    }

    // Try as node definition
    const nodeMatch = line.match(nodeDefPattern);
    if (nodeMatch) {
      const [, id, shapePart] = nodeMatch;
      const trimmedShape = shapePart.trim();
      const type = inferNodeType(trimmedShape);
      const label = extractLabel(trimmedShape);

      nodeMap.set(id, {
        id,
        type,
        label,
        position: { x: 0, y: 0 }, // will be laid out below
        config: {},
        pattern_id: null,
        metadata: {},
      });
    }
  }

  // Auto-layout: simple top-down grid
  const nodes = Array.from(nodeMap.values());
  const cols = Math.ceil(Math.sqrt(nodes.length));
  nodes.forEach((node, i) => {
    node.position = {
      x: (i % cols) * 250 + 100,
      y: Math.floor(i / cols) * 180 + 100,
    };
  });

  // Remap node IDs to UUIDs for the actual graph
  const idRemap = new Map<string, string>();
  for (const node of nodes) {
    const newId = crypto.randomUUID();
    idRemap.set(node.id, newId);
    node.id = newId;
  }

  for (const edge of edges) {
    edge.source = idRemap.get(edge.source) ?? edge.source;
    edge.target = idRemap.get(edge.target) ?? edge.target;
  }

  return { nodes, edges };
}

function makeDefaultNode(id: string): GraphNode {
  return {
    id,
    type: NodeType.LLM,
    label: id,
    position: { x: 0, y: 0 },
    config: {},
    pattern_id: null,
    metadata: {},
  };
}
