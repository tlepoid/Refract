import { Router } from 'express';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import type { Pattern } from '@refract/shared';

const patternsDir = resolve(
  import.meta.dirname,
  '../../shared/patterns',
);

const patternCache = new Map<string, Pattern>();

export function loadPatterns(): Map<string, Pattern> {
  if (patternCache.size > 0) return patternCache;

  const files = readdirSync(patternsDir).filter((f) => f.endsWith('.yaml'));
  for (const file of files) {
    const raw = readFileSync(join(patternsDir, file), 'utf-8');
    const pattern = parse(raw) as Pattern;
    patternCache.set(pattern.id, pattern);
    console.log(`  Loaded pattern: ${pattern.id} (${pattern.name})`);
  }
  console.log(`Pattern library: ${patternCache.size} patterns loaded`);
  return patternCache;
}

export function getPatterns(): Pattern[] {
  return Array.from(patternCache.values());
}

export function getPatternById(id: string): Pattern | undefined {
  return patternCache.get(id);
}

export const patternRouter = Router();

patternRouter.get('/api/patterns', (_req, res) => {
  const patterns = getPatterns().map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    trade_offs: p.trade_offs,
  }));
  res.json({ patterns });
});

patternRouter.get('/api/patterns/:id', (req, res) => {
  const pattern = getPatternById(req.params.id);
  if (!pattern) {
    res.status(404).json({ error: `Pattern '${req.params.id}' not found` });
    return;
  }
  res.json(pattern);
});
