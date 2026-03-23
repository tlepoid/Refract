import express from 'express';
import { loadPatterns, patternRouter } from './patterns.js';
import { evalRouter } from './eval-api.js';

const app = express();
const PORT = 4000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(patternRouter);
app.use(evalRouter);

loadPatterns();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
