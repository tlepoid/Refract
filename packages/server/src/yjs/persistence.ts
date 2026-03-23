import * as Y from 'yjs';
import { pool } from '../db/pool.js';
import { docs } from './wsServer.js';

const DEBOUNCE_MS = 2000;
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Load Yjs state from PostgreSQL into the doc.
 * Called when first client connects to a canvas.
 */
export async function loadDoc(canvasId: string, doc: Y.Doc): Promise<void> {
  const result = await pool.query('SELECT yjs_state FROM canvases WHERE id = $1', [canvasId]);
  if (result.rows.length > 0 && result.rows[0].yjs_state) {
    Y.applyUpdate(doc, new Uint8Array(result.rows[0].yjs_state));
    console.log(`[persistence] Loaded state for canvas: ${canvasId}`);
  }
}

/**
 * Save Yjs state to PostgreSQL (debounced).
 */
export function scheduleSave(canvasId: string, doc: Y.Doc): void {
  const existing = saveTimers.get(canvasId);
  if (existing) clearTimeout(existing);

  saveTimers.set(
    canvasId,
    setTimeout(async () => {
      saveTimers.delete(canvasId);
      try {
        const state = Buffer.from(Y.encodeStateAsUpdate(doc));
        await pool.query(
          `INSERT INTO canvases (id, name, team_id, yjs_state, updated_at)
           VALUES ($1, $2, $3, $4, now())
           ON CONFLICT (id) DO UPDATE SET yjs_state = $4, updated_at = now()`,
          [canvasId, 'Untitled', 'default', state],
        );
        console.log(`[persistence] Saved state for canvas: ${canvasId}`);
      } catch (err) {
        console.error(`[persistence] Failed to save canvas ${canvasId}:`, err);
      }
    }, DEBOUNCE_MS),
  );
}

/**
 * Attach persistence hooks to a canvas doc.
 */
export function attachPersistence(canvasId: string, doc: Y.Doc): void {
  doc.on('update', () => {
    scheduleSave(canvasId, doc);
  });
}
