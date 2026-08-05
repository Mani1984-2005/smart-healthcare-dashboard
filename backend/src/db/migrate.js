import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  const client = await pool.connect();
  try {
    logger.info('Running database migration...');
    await client.query(sql);
    logger.info('✅ Migration complete. Schema is up to date.');
  } catch (err) {
    logger.error('❌ Migration failed', { error: err.message });
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
