import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import {
  serializeGraphForLLM,
  identifyPatterns,
  evaluateGraph,
} from '@refract/shared';
import type { GraphNode, GraphEdge } from '@refract/shared';
import { getPatternById, getPatterns } from './patterns.js';

export const analyzeRouter: ReturnType<typeof Router> = Router();

const client = new Anthropic();

// ── Rate limiting: 1 per 5s per canvas ──

const lastCallByCanvas = new Map<string, number>();

function isRateLimited(canvasId: string): boolean {
  const now = Date.now();
  const last = lastCallByCanvas.get(canvasId);
  if (last && now - last < 5000) return true;
  lastCallByCanvas.set(canvasId, now);
  return false;
}

// ── Claude tool definitions ──

const tools: Anthropic.Tool[] = [
  {
    name: 'analyze_tradeoffs',
    description:
      'Analyse the trade-offs of the current graph design. Return strengths, weaknesses, risks, and recommendations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        strengths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Strengths of the current design',
        },
        weaknesses: {
          type: 'array',
          items: { type: 'string' },
          description: 'Weaknesses of the current design',
        },
        risks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Risks in the current design',
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Recommendations for improvement',
        },
      },
      required: ['strengths', 'weaknesses', 'risks', 'recommendations'],
    },
  },
  {
    name: 'suggest_alternative',
    description:
      'Suggest an alternative design with concrete node and edge changes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        description: {
          type: 'string',
          description: 'Description of the alternative',
        },
        node_diff: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['add', 'remove', 'modify'] },
              node_id: { type: 'string' },
              details: { type: 'string' },
            },
          },
          description: 'Node changes',
        },
        edge_diff: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['add', 'remove', 'modify'] },
              edge_id: { type: 'string' },
              details: { type: 'string' },
            },
          },
          description: 'Edge changes',
        },
      },
      required: ['description', 'node_diff', 'edge_diff'],
    },
  },
  {
    name: 'compare_patterns',
    description: 'Compare two patterns side by side.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern_a: { type: 'string', description: 'First pattern ID' },
        pattern_b: { type: 'string', description: 'Second pattern ID' },
        comparison_table: {
          type: 'object',
          description: 'Comparison across dimensions',
          additionalProperties: {
            type: 'object',
            properties: {
              pattern_a_value: { type: 'string' },
              pattern_b_value: { type: 'string' },
            },
          },
        },
      },
      required: ['pattern_a', 'pattern_b', 'comparison_table'],
    },
  },
  {
    name: 'explain_pattern',
    description:
      'Explain a pattern in the context of this specific graph.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern_id: { type: 'string' },
        explanation: { type: 'string' },
        context_specific_notes: { type: 'string' },
      },
      required: ['pattern_id', 'explanation', 'context_specific_notes'],
    },
  },
  {
    name: 'identify_risks',
    description: 'Identify specific risks in the current graph design.',
    input_schema: {
      type: 'object' as const,
      properties: {
        risks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
              },
              description: { type: 'string' },
              mitigation: { type: 'string' },
            },
            required: ['severity', 'description', 'mitigation'],
          },
        },
      },
      required: ['risks'],
    },
  },
];

// ── Build system prompt ──

function buildSystemPrompt(
  serializedGraph: string,
  matchedPatterns: { patternId: string; confidence: number }[],
  scores: object | null,
): string {
  let patternsSection = 'None identified';
  if (matchedPatterns.length > 0) {
    const details = matchedPatterns
      .map((m) => {
        const p = getPatternById(m.patternId);
        if (!p) return `- ${m.patternId} (confidence: ${m.confidence})`;
        return `- ${p.name} (${m.patternId}, confidence: ${m.confidence})\n  ${p.description.trim().split('\n')[0]}`;
      })
      .join('\n');
    patternsSection = details;
  }

  const scoresSection = scores
    ? JSON.stringify(scores, null, 2)
    : 'Not yet computed';

  return `You are an AI agent architecture analyst. You analyse software designs for AI agent systems and surface trade-offs.

Current graph state:
${serializedGraph}

Identified patterns:
${patternsSection}

Current eval scores:
${scoresSection}

Instructions:
- Be specific to THIS graph, not generic
- Reference concrete nodes by their labels
- Quantify trade-offs using the eval profile data
- If suggesting alternatives, provide concrete node/edge diffs`;
}

// ── Route handler ──

analyzeRouter.post('/api/analyze', async (req, res) => {
  try {
    const { canvas_id, graph, mode, message, history } = req.body;

    if (!graph || !mode) {
      res.status(400).json({ error: 'Missing graph or mode in request body' });
      return;
    }

    // Rate limit passive mode
    if (mode === 'passive' && canvas_id && isRateLimited(canvas_id)) {
      res.status(429).json({ error: 'Rate limited. Max 1 request per 5 seconds per canvas.' });
      return;
    }

    const nodes: GraphNode[] = graph.nodes ?? [];
    const edges: GraphEdge[] = graph.edges ?? [];

    // Serialise and analyse
    const serialized = serializeGraphForLLM(nodes, edges);
    const patterns = identifyPatterns(nodes, edges);

    // Compute scores
    const patternProfiles = new Map<string, any>();
    for (const p of getPatterns()) {
      patternProfiles.set(p.id, p.eval_profile);
    }
    const scores = evaluateGraph(nodes, edges, patternProfiles);

    const systemPrompt = buildSystemPrompt(serialized, patterns, scores);

    // Build messages
    const messages: Anthropic.MessageParam[] = [];

    if (mode === 'conversational' && history) {
      for (const h of history) {
        messages.push(h);
      }
    }

    if (mode === 'passive') {
      messages.push({
        role: 'user',
        content:
          'Analyse this agent architecture graph. Identify trade-offs, risks, and suggest improvements. Use the available tools to structure your analysis.',
      });
    } else if (mode === 'conversational' && message) {
      messages.push({ role: 'user', content: message });
    } else {
      res.status(400).json({ error: 'Invalid mode or missing message for conversational mode' });
      return;
    }

    // SSE setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Call Claude with streaming
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      tools,
    });

    const toolResults: Record<string, unknown>[] = [];

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
    });

    stream.on('inputJson', (json, snapshot) => {
      res.write(
        `data: ${JSON.stringify({ type: 'tool_input', content: json })}\n\n`,
      );
    });

    stream.on('message', (msg) => {
      // Extract tool use results
      for (const block of msg.content) {
        if (block.type === 'tool_use') {
          toolResults.push({
            tool: block.name,
            input: block.input,
          });
        }
      }

      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          tool_results: toolResults,
          patterns: patterns.map((p) => ({
            patternId: p.patternId,
            confidence: p.confidence,
          })),
          scores,
        })}\n\n`,
      );
      res.end();
    });

    stream.on('error', (error) => {
      res.write(
        `data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`,
      );
      res.end();
    });
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message ?? 'Internal server error' });
    } else {
      res.write(
        `data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`,
      );
      res.end();
    }
  }
});
