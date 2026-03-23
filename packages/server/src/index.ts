import express from 'express';
import http from 'node:http';
import { createYjsWebSocketServer } from './yjs/wsServer.js';

const app = express();
const PORT = 4000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);

createYjsWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket accepting connections at ws://localhost:${PORT}/ws/canvas/:id`);
});
