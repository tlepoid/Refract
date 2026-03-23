import type { GraphNode, GraphEdge, Pattern, Scorecard } from './types';

// ── Model pricing (USD per million tokens) ──

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-opus-4': { input: 15, output: 75 },
  'gpt-4o': { input: 2.5, output: 10 },
};

const DEFAULT_PRICING = { input: 3, output: 15 };

// ── Complexity weights per node type ──

const COMPLEXITY_WEIGHTS: Record<string, number> = {
  llm: 2,
  tool: 1,
  memory: 1,
  router: 3,
  planner: 3,
  guardrail: 1,
  human_in_loop: 2,
  input: 0,
  output: 0,
};

// ── Graph traversal helpers ──

function buildAdjacency(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { outgoing: Map<string, string[]>; incoming: Map<string, string[]> } {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const n of nodes) {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  }
  for (const e of edges) {
    outgoing.get(e.source)?.push(e.target);
    incoming.get(e.target)?.push(e.source);
  }
  return { outgoing, incoming };
}

function findAllPaths(
  startIds: string[],
  endIds: string[],
  outgoing: Map<string, string[]>,
  maxDepth = 50,
): string[][] {
  const endSet = new Set(endIds);
  const paths: string[][] = [];

  function dfs(current: string, path: string[], visited: Set<string>) {
    if (path.length > maxDepth) return;
    if (endSet.has(current)) {
      paths.push([...path]);
      return;
    }
    const neighbours = outgoing.get(current) ?? [];
    for (const next of neighbours) {
      if (!visited.has(next)) {
        visited.add(next);
        path.push(next);
        dfs(next, path, visited);
        path.pop();
        visited.delete(next);
      }
    }
  }

  for (const start of startIds) {
    dfs(start, [start], new Set([start]));
  }

  return paths;
}

function detectParallelBranches(
  outgoing: Map<string, string[]>,
  nodeMap: Map<string, GraphNode>,
): Set<string> {
  // Nodes that are children of a router or have siblings = parallel candidates
  const parallel = new Set<string>();
  for (const [nodeId, targets] of outgoing) {
    const node = nodeMap.get(nodeId);
    if (node?.type === 'router' && targets.length > 1) {
      for (const t of targets) parallel.add(t);
    }
  }
  return parallel;
}

// ── Eval profile lookup ──

interface EvalProfile {
  tokens_per_step: [number, number, number];
  steps_per_task: [number, number, number];
  p50_latency_ms: number;
  p99_latency_ms: number;
  failure_rate: number;
}

function getNodeProfile(
  node: GraphNode,
  patternProfiles: Map<string, EvalProfile>,
): EvalProfile | null {
  // Check if node has a pattern_id with a profile
  if (node.pattern_id && patternProfiles.has(node.pattern_id)) {
    return patternProfiles.get(node.pattern_id)!;
  }
  // Default profiles for LLM/Planner nodes without pattern
  if (node.type === 'llm' || node.type === 'planner') {
    return {
      tokens_per_step: [150, 500, 1500],
      steps_per_task: [1, 1, 3],
      p50_latency_ms: 1000,
      p99_latency_ms: 5000,
      failure_rate: 0.02,
    };
  }
  return null;
}

// ── Main eval function ──

export function evaluateGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  patternProfiles: Map<string, EvalProfile>,
): Scorecard {
  if (nodes.length === 0) {
    return {
      cost: { min: 0, median: 0, max: 0, currency: 'USD' },
      latency_p50_ms: 0,
      latency_p99_ms: 0,
      reliability: 1,
      complexity: 0,
    };
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const { outgoing, incoming } = buildAdjacency(nodes, edges);

  // Find Input/Output nodes
  const inputNodes = nodes.filter((n) => n.type === 'input');
  const outputNodes = nodes.filter((n) => n.type === 'output');

  // Get LLM/Planner nodes that contribute to cost
  const computeNodes = nodes.filter(
    (n) => n.type === 'llm' || n.type === 'planner',
  );

  // ── Token cost ──
  let totalTokensMin = 0;
  let totalTokensMedian = 0;
  let totalTokensMax = 0;

  for (const node of computeNodes) {
    const profile = getNodeProfile(node, patternProfiles);
    if (!profile) continue;

    const stepsMedian = profile.steps_per_task[1];
    totalTokensMin += profile.tokens_per_step[0] * profile.steps_per_task[0];
    totalTokensMedian += profile.tokens_per_step[1] * stepsMedian;
    totalTokensMax += profile.tokens_per_step[2] * profile.steps_per_task[2];
  }

  // Average model pricing across compute nodes
  let avgInput = 0;
  let avgOutput = 0;
  let modelCount = 0;

  for (const node of computeNodes) {
    const model = node.config?.model as string | undefined;
    const pricing = model ? (MODEL_PRICING[model] ?? DEFAULT_PRICING) : DEFAULT_PRICING;
    avgInput += pricing.input;
    avgOutput += pricing.output;
    modelCount++;
  }

  if (modelCount === 0) {
    avgInput = DEFAULT_PRICING.input;
    avgOutput = DEFAULT_PRICING.output;
  } else {
    avgInput /= modelCount;
    avgOutput /= modelCount;
  }

  // Assume ~40% input, 60% output token split
  const costPerMToken = avgInput * 0.4 + avgOutput * 0.6;

  const costMin = (totalTokensMin / 1_000_000) * costPerMToken;
  const costMedian = (totalTokensMedian / 1_000_000) * costPerMToken;
  const costMax = (totalTokensMax / 1_000_000) * costPerMToken;

  // ── Latency ──
  const parallelNodes = detectParallelBranches(outgoing, nodeMap);
  let latencyP50 = 0;
  let latencyP99 = 0;

  if (inputNodes.length > 0 && outputNodes.length > 0) {
    const paths = findAllPaths(
      inputNodes.map((n) => n.id),
      outputNodes.map((n) => n.id),
      outgoing,
    );

    if (paths.length > 0) {
      // For each path, sum latencies (serial)
      let maxPathP50 = 0;
      let maxPathP99 = 0;

      for (const path of paths) {
        let pathP50 = 0;
        let pathP99 = 0;
        for (const nodeId of path) {
          const node = nodeMap.get(nodeId);
          if (!node) continue;
          const profile = getNodeProfile(node, patternProfiles);
          if (profile) {
            pathP50 += profile.p50_latency_ms;
            pathP99 += profile.p99_latency_ms;
          }
        }
        maxPathP50 = Math.max(maxPathP50, pathP50);
        maxPathP99 = Math.max(maxPathP99, pathP99);
      }

      latencyP50 = maxPathP50;
      latencyP99 = maxPathP99;
    }
  }

  // Fallback: if no paths found, sum all compute node latencies
  if (latencyP50 === 0 && computeNodes.length > 0) {
    for (const node of computeNodes) {
      const profile = getNodeProfile(node, patternProfiles);
      if (profile) {
        latencyP50 += profile.p50_latency_ms;
        latencyP99 += profile.p99_latency_ms;
      }
    }
  }

  // ── Reliability ──
  // Serial: multiply (1-failure_rate) across chain
  let reliability = 1;
  for (const node of computeNodes) {
    const profile = getNodeProfile(node, patternProfiles);
    if (profile) {
      reliability *= 1 - profile.failure_rate;
    }
  }

  // ── Complexity ──
  let complexity = 0;
  for (const node of nodes) {
    complexity += COMPLEXITY_WEIGHTS[node.type] ?? 1;
  }

  return {
    cost: {
      min: Math.round(costMin * 1_000_000) / 1_000_000,
      median: Math.round(costMedian * 1_000_000) / 1_000_000,
      max: Math.round(costMax * 1_000_000) / 1_000_000,
      currency: 'USD',
    },
    latency_p50_ms: Math.round(latencyP50),
    latency_p99_ms: Math.round(latencyP99),
    reliability: Math.round(reliability * 10000) / 10000,
    complexity,
  };
}
