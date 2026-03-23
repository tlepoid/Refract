import { WebSocketServer, WebSocket } from 'ws';
import http from 'node:http';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { initCanvasDoc } from './documentSchema.js';
import { loadDoc, attachPersistence } from './persistence.js';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

interface DocEntry {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Set<WebSocket>;
  ready: Promise<void>;
}

const docs = new Map<string, DocEntry>();

function getOrCreateDoc(canvasId: string): DocEntry {
  let entry = docs.get(canvasId);
  if (entry) return entry;

  const doc = new Y.Doc();
  initCanvasDoc(doc);

  const awareness = new awarenessProtocol.Awareness(doc);

  // Load persisted state asynchronously
  const ready = loadDoc(canvasId, doc)
    .then(() => {
      attachPersistence(canvasId, doc);
    })
    .catch((err) => {
      // DB may not be available — continue with in-memory doc
      console.warn(`[yjs] Could not load from DB for canvas ${canvasId}:`, err.message);
    });

  awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
    const changedClients = added.concat(updated, removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_AWARENESS);
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
    const message = encoding.toUint8Array(encoder);

    const entry = docs.get(canvasId);
    if (entry) {
      entry.conns.forEach((conn) => {
        if (conn.readyState === WebSocket.OPEN) {
          conn.send(message);
        }
      });
    }
  });

  entry = { doc, awareness, conns: new Set(), ready };
  docs.set(canvasId, entry);
  return entry;
}

const CANVAS_PATH_RE = /^\/ws\/canvas\/([a-zA-Z0-9_-]+)$/;

export function createYjsWebSocketServer(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '', `http://${request.headers.host}`);
    const match = url.pathname.match(CANVAS_PATH_RE);

    if (!match) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', async (ws: WebSocket, request: http.IncomingMessage) => {
    const url = new URL(request.url ?? '', `http://${request.headers.host}`);
    const match = url.pathname.match(CANVAS_PATH_RE);
    const canvasId = match![1];

    const entry = getOrCreateDoc(canvasId);
    const { doc, awareness, conns } = entry;
    conns.add(ws);

    console.log(`[yjs] Client connected to canvas: ${canvasId} (${conns.size} total)`);

    // Wait for persisted state to be loaded before syncing
    await entry.ready;

    // Send initial sync step 1
    const syncEncoder = encoding.createEncoder();
    encoding.writeVarUint(syncEncoder, MSG_SYNC);
    syncProtocol.writeSyncStep1(syncEncoder, doc);
    ws.send(encoding.toUint8Array(syncEncoder));

    // Send current awareness state
    const awarenessStates = awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MSG_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys())),
      );
      ws.send(encoding.toUint8Array(awarenessEncoder));
    }

    // Listen for doc updates and broadcast to all other clients
    const docUpdateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin === ws) return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(encoding.toUint8Array(encoder));
      }
    };
    doc.on('update', docUpdateHandler);

    ws.on('message', (data: ArrayBuffer | Buffer) => {
      const message = new Uint8Array(data instanceof ArrayBuffer ? data : data.buffer);
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MSG_SYNC: {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MSG_SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, doc, ws);
          if (encoding.length(encoder) > 1) {
            ws.send(encoding.toUint8Array(encoder));
          }
          break;
        }
        case MSG_AWARENESS: {
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            decoding.readVarUint8Array(decoder),
            ws,
          );
          break;
        }
      }
    });

    ws.on('close', () => {
      conns.delete(ws);
      doc.off('update', docUpdateHandler);
      awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], null);
      console.log(`[yjs] Client disconnected from canvas: ${canvasId} (${conns.size} remaining)`);
    });
  });

  return wss;
}

/** Exposed for persistence layer (#60) */
export function getDocEntry(canvasId: string) {
  return docs.get(canvasId);
}

export { docs };
