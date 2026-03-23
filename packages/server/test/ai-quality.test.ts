import { describe, it, expect } from 'vitest';
import { identifyPatterns, evaluateGraph } from '@refract/shared';
import type { GraphNode, GraphEdge } from '@refract/shared';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface GraphFixture {
  name: string;
  description: string;
  expectedPatterns: string[];
  expectedRisks: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const FIXTURES_DIR = join(__dirname, 'fixtures/graphs');

function loadFixtures(): GraphFixture[] {
  const files = readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => JSON.parse(readFileSync(join(FIXTURES_DIR, f), 'utf-8')));
}

describe('AI Quality Evaluation Suite', () => {
  const fixtures = loadFixtures();

  describe('Pattern Detection', () => {
    for (const fixture of fixtures) {
      it(`detects expected patterns in "${fixture.name}"`, () => {
        const matches = identifyPatterns(fixture.nodes, fixture.edges);
        const detectedIds = matches.map(m => m.patternId);

        for (const expected of fixture.expectedPatterns) {
          expect(detectedIds, `Expected pattern "${expected}" in "${fixture.name}"`).toContain(expected);
        }
      });
    }
  });

  describe('Scorecard Evaluation', () => {
    for (const fixture of fixtures) {
      it(`produces valid scorecard for "${fixture.name}"`, () => {
        const scorecard = evaluateGraph(fixture.nodes, fixture.edges, new Map());

        expect(scorecard.cost.currency).toBe('USD');
        expect(scorecard.cost.min).toBeLessThanOrEqual(scorecard.cost.median);
        expect(scorecard.cost.median).toBeLessThanOrEqual(scorecard.cost.max);
        expect(scorecard.reliability).toBeGreaterThanOrEqual(0);
        expect(scorecard.reliability).toBeLessThanOrEqual(1);
        expect(scorecard.complexity).toBeGreaterThanOrEqual(0);

        // Non-empty graphs should have non-zero complexity
        if (fixture.nodes.length > 0) {
          expect(scorecard.complexity).toBeGreaterThan(0);
        }
      });
    }
  });

  describe('Risk Detection', () => {
    for (const fixture of fixtures) {
      if (fixture.expectedRisks.length === 0) continue;

      it(`identifies risks in "${fixture.name}"`, () => {
        const nodes = fixture.nodes;
        const edges = fixture.edges;

        const hasInput = nodes.some(n => n.type === 'input');
        const hasOutput = nodes.some(n => n.type === 'output');
        const hasGuardrails = nodes.some(n => n.type === 'guardrail');

        const risks: string[] = [];
        if (!hasInput && nodes.length > 0) risks.push('no input');
        if (!hasOutput && nodes.length > 0) risks.push('no output');
        if (!hasGuardrails && nodes.some(n => n.type === 'llm')) risks.push('no guardrails');

        // Check for disconnected nodes
        if (nodes.length > 1) {
          const connected = new Set<string>();
          for (const e of edges) {
            connected.add(e.source);
            connected.add(e.target);
          }
          const disconnected = nodes.filter(n => !connected.has(n.id));
          if (disconnected.length > 0 && edges.length > 0) risks.push('disconnected graph');
        }

        for (const expectedRisk of fixture.expectedRisks) {
          expect(risks, `Expected risk "${expectedRisk}" in "${fixture.name}"`).toContain(expectedRisk);
        }
      });
    }
  });
});
