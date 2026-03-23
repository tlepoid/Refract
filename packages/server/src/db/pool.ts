import pg from 'pg';

export const pool = new pg.Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'refract',
  password: process.env.PGPASSWORD ?? 'refract',
  database: process.env.PGDATABASE ?? 'refract',
});

export async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS canvases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      team_id TEXT NOT NULL,
      yjs_state BYTEA,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('[db] Migrations applied');
}
