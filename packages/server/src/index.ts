import express from 'express';
import { loadPatterns, patternRouter } from './patterns.js';

const app = express();
const PORT = 4000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(patternRouter);

loadPatterns();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
