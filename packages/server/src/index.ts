import express from 'express';
import http from 'node:http';
import { createYjsWebSocketServer } from './yjs/wsServer.js';
import { pool, runMigrations } from './db/pool.js';
import { loadPatterns, patternRouter } from './patterns.js';
import { evalRouter } from './eval-api.js';
import { analyzeRouter } from './analyze.js';

const app = express();
const PORT = 4000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Canvas REST API ──

app.post('/api/canvas', async (req, res) => {
  const { name, team_id } = req.body;
  if (!name || !team_id) {
    res.status(400).json({ error: 'name and team_id are required' });
    return;
  }
  const result = await pool.query(
    'INSERT INTO canvases (name, team_id) VALUES ($1, $2) RETURNING id, name, team_id, created_at, updated_at',
    [name, team_id],
  );
  res.status(201).json(result.rows[0]);
});

app.get('/api/canvas/:id', async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, team_id, created_at, updated_at FROM canvases WHERE id = $1',
    [req.params.id],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Canvas not found' });
    return;
  }
  res.json(result.rows[0]);
});

app.get('/api/canvases', async (req, res) => {
  const teamId = req.query.team_id as string;
  if (!teamId) {
    res.status(400).json({ error: 'team_id query parameter is required' });
    return;
  }
  const result = await pool.query(
    'SELECT id, name, team_id, created_at, updated_at FROM canvases WHERE team_id = $1 ORDER BY updated_at DESC',
    [teamId],
  );
  res.json(result.rows);
app.use(patternRouter);
app.use(evalRouter);
app.use(analyzeRouter);

loadPatterns();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.delete('/api/canvas/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM canvases WHERE id = $1 RETURNING id', [
    req.params.id,
  ]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Canvas not found' });
    return;
  }
  res.json({ deleted: true });
});

const server = http.createServer(app);

createYjsWebSocketServer(server);

// Run migrations then start
runMigrations()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`WebSocket accepting connections at ws://localhost:${PORT}/ws/canvas/:id`);
    });
  })
  .catch((err) => {
    console.warn('[db] Migration failed, starting without persistence:', err.message);
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT} (no DB)`);
      console.log(`WebSocket accepting connections at ws://localhost:${PORT}/ws/canvas/:id`);
    });
  });
