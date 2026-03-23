import type { GraphNode, GraphEdge, PatternMatch } from './index.js';

// ── Graph Serialiser ──

export function serializeGraphForLLM(
  nodes: GraphNode[],
  edges: GraphEdge[],
): string {
  const compactNodes = nodes.map((n) => ({
    id: n.id,
    type: n.type,
    label: n.label,
    config: n.config,
    pattern_id: n.pattern_id,
  }));

  const compactEdges = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type,
  }));

  return JSON.stringify({ nodes: compactNodes, edges: compactEdges });
}

// ── Pattern Matcher ──

function buildAdjacency(
  nodes: GraphNode[],
  edges: GraphEdge[],
): {
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
  nodeMap: Map<string, GraphNode>;
} {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const nodeMap = new Map<string, GraphNode>();

  for (const n of nodes) {
    nodeMap.set(n.id, n);
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  }

  for (const e of edges) {
    outgoing.get(e.source)?.push(e.target);
    incoming.get(e.target)?.push(e.source);
  }

  return { outgoing, incoming, nodeMap };
}

function hasCycle(startId: string, outgoing: Map<string, string[]>): boolean {
  const visited = new Set<string>();
  const stack = [startId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const neighbours = outgoing.get(current) ?? [];
    for (const next of neighbours) {
      if (next === startId) return true;
      if (!visited.has(next)) {
        visited.add(next);
        stack.push(next);
      }
    }
  }
  return false;
}

function detectReact(
  nodes: GraphNode[],
  edges: GraphEdge[],
  outgoing: Map<string, string[]>,
  nodeMap: Map<string, GraphNode>,
): PatternMatch | null {
  // ReAct: Planner(pattern=react) connected to Tools in a cycle
  const planners = nodes.filter(
    (n) => n.type === 'planner' && n.config?.pattern === 'react',
  );

  for (const planner of planners) {
    if (hasCycle(planner.id, outgoing)) {
      const involved = new Set<string>([planner.id]);
      const targets = outgoing.get(planner.id) ?? [];
      for (const t of targets) {
        const node = nodeMap.get(t);
        if (node?.type === 'tool') involved.add(t);
      }
      // Check tools connect back
      const sources = edges
        .filter((e) => e.target === planner.id)
        .map((e) => e.source);
      for (const s of sources) {
        const node = nodeMap.get(s);
        if (node?.type === 'tool') involved.add(s);
      }
      return {
        patternId: 'react',
        confidence: 1.0,
        involvedNodeIds: Array.from(involved),
      };
    }
  }

  // Partial match: planner with react pattern but no cycle
  const partialPlanners = nodes.filter(
    (n) => n.type === 'planner' && n.config?.pattern === 'react',
  );
  if (partialPlanners.length > 0) {
    return {
      patternId: 'react',
      confidence: 0.5,
      involvedNodeIds: partialPlanners.map((n) => n.id),
    };
  }

  return null;
}

function detectPlanExecute(
  nodes: GraphNode[],
  edges: GraphEdge[],
  outgoing: Map<string, string[]>,
  nodeMap: Map<string, GraphNode>,
): PatternMatch | null {
  // Plan-Execute: Planner(pattern=plan-execute) with sequential tool chain
  const planners = nodes.filter(
    (n) => n.type === 'planner' && n.config?.pattern === 'plan-execute',
  );

  for (const planner of planners) {
    const targets = outgoing.get(planner.id) ?? [];
    const toolTargets = targets.filter(
      (t) => nodeMap.get(t)?.type === 'tool',
    );
    if (toolTargets.length > 0) {
      const involved = [planner.id, ...toolTargets];
      // Follow the sequential chain
      for (const tool of toolTargets) {
        const next = outgoing.get(tool) ?? [];
        for (const n of next) {
          if (nodeMap.get(n)?.type === 'tool') involved.push(n);
        }
      }
      return {
        patternId: 'plan-execute',
        confidence: 1.0,
        involvedNodeIds: [...new Set(involved)],
      };
    }
  }

  return null;
}

function detectMultiAgentChat(
  nodes: GraphNode[],
  edges: GraphEdge[],
  outgoing: Map<string, string[]>,
  incoming: Map<string, string[]>,
  nodeMap: Map<string, GraphNode>,
): PatternMatch | null {
  // Multiple LLM nodes connected via Router
  const routers = nodes.filter((n) => n.type === 'router');

  for (const router of routers) {
    const targets = outgoing.get(router.id) ?? [];
    const llmTargets = targets.filter(
      (t) => nodeMap.get(t)?.type === 'llm',
    );
    // Check if LLMs connect back to router (chat loop)
    const sources = incoming.get(router.id) ?? [];
    const llmSources = sources.filter(
      (s) => nodeMap.get(s)?.type === 'llm',
    );

    if (llmTargets.length >= 2 && llmSources.length >= 1) {
      const involved = [router.id, ...llmTargets, ...llmSources];
      return {
        patternId: 'multi-agent-chat',
        confidence: 1.0,
        involvedNodeIds: [...new Set(involved)],
      };
    }

    if (llmTargets.length >= 2) {
      const involved = [router.id, ...llmTargets];
      return {
        patternId: 'multi-agent-chat',
        confidence: 0.7,
        involvedNodeIds: [...new Set(involved)],
      };
    }
  }

  return null;
}

function detectHandoff(
  nodes: GraphNode[],
  edges: GraphEdge[],
  outgoing: Map<string, string[]>,
  nodeMap: Map<string, GraphNode>,
): PatternMatch | null {
  // Handoff: LLM → Router → LLM chain, or Router → LLM → LLM chain
  for (const edge of edges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);

    if (src?.type === 'llm' && tgt?.type === 'llm') {
      // Direct LLM-to-LLM handoff
      const involved = [src.id, tgt.id];
      // Check if there's a router upstream
      const routers = nodes.filter(
        (n) =>
          n.type === 'router' &&
          (outgoing.get(n.id) ?? []).includes(src.id),
      );
      if (routers.length > 0) {
        involved.unshift(routers[0].id);
        return {
          patternId: 'handoff',
          confidence: 1.0,
          involvedNodeIds: [...new Set(involved)],
        };
      }
      return {
        patternId: 'handoff',
        confidence: 0.8,
        involvedNodeIds: involved,
      };
    }
  }

  return null;
}

function detectRouting(
  nodes: GraphNode[],
  outgoing: Map<string, string[]>,
): PatternMatch | null {
  // Router node with 2+ outgoing edges
  const routers = nodes.filter((n) => n.type === 'router');

  for (const router of routers) {
    const targets = outgoing.get(router.id) ?? [];
    if (targets.length >= 2) {
      return {
        patternId: 'routing',
        confidence: 1.0,
        involvedNodeIds: [router.id, ...targets],
      };
    }
  }

  return null;
}

function detectReflection(
  nodes: GraphNode[],
  edges: GraphEdge[],
  outgoing: Map<string, string[]>,
  incoming: Map<string, string[]>,
  nodeMap: Map<string, GraphNode>,
): PatternMatch | null {
  // LLM with output feeding back to its own input (via Guardrail or direct)
  for (const node of nodes) {
    if (node.type !== 'llm') continue;

    // Direct self-loop
    if (hasCycle(node.id, outgoing)) {
      const involved = [node.id];
      // Find guardrails in the loop
      const targets = outgoing.get(node.id) ?? [];
      for (const t of targets) {
        const tNode = nodeMap.get(t);
        if (tNode?.type === 'guardrail') {
          involved.push(t);
          // Check if guardrail feeds back
          const gTargets = outgoing.get(t) ?? [];
          if (gTargets.includes(node.id)) {
            return {
              patternId: 'reflection',
              confidence: 1.0,
              involvedNodeIds: involved,
            };
          }
        }
      }
      return {
        patternId: 'reflection',
        confidence: 0.8,
        involvedNodeIds: involved,
      };
    }
  }

  // Also detect planner with reflection pattern
  const reflectionPlanners = nodes.filter(
    (n) => n.type === 'planner' && n.config?.pattern === 'reflection',
  );
  if (reflectionPlanners.length > 0) {
    return {
      patternId: 'reflection',
      confidence: 0.9,
      involvedNodeIds: reflectionPlanners.map((n) => n.id),
    };
  }

  return null;
}

export function identifyPatterns(
  nodes: GraphNode[],
  edges: GraphEdge[],
): PatternMatch[] {
  const { outgoing, incoming, nodeMap } = buildAdjacency(nodes, edges);
  const matches: PatternMatch[] = [];

  const react = detectReact(nodes, edges, outgoing, nodeMap);
  if (react) matches.push(react);

  const planExec = detectPlanExecute(nodes, edges, outgoing, nodeMap);
  if (planExec) matches.push(planExec);

  const multiAgent = detectMultiAgentChat(
    nodes,
    edges,
    outgoing,
    incoming,
    nodeMap,
  );
  if (multiAgent) matches.push(multiAgent);

  const handoff = detectHandoff(nodes, edges, outgoing, nodeMap);
  if (handoff) matches.push(handoff);

  const routing = detectRouting(nodes, outgoing);
  if (routing) matches.push(routing);

  const reflection = detectReflection(
    nodes,
    edges,
    outgoing,
    incoming,
    nodeMap,
  );
  if (reflection) matches.push(reflection);

  return matches;
}
