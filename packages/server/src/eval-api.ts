import { Router } from 'express';
import { evaluateGraph } from '@refract/shared';
import { getPatterns } from './patterns.js';

export const evalRouter: ReturnType<typeof Router> = Router();

evalRouter.post('/api/eval', (req, res) => {
  const { graph } = req.body;

  if (!graph) {
    res.status(400).json({ error: 'Missing graph in request body' });
    return;
  }

  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  // Build pattern profiles map from loaded patterns
  const patternProfiles = new Map<
    string,
    {
      tokens_per_step: [number, number, number];
      steps_per_task: [number, number, number];
      p50_latency_ms: number;
      p99_latency_ms: number;
      failure_rate: number;
    }
  >();

  for (const pattern of getPatterns()) {
    patternProfiles.set(pattern.id, pattern.eval_profile);
  }

  const scorecard = evaluateGraph(nodes, edges, patternProfiles);
  res.json(scorecard);
});
