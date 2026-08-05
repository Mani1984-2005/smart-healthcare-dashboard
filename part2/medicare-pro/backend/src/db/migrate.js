import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  // Part 1 (Foundation & OCR), then Part 2 (AI Intelligence) — order matters,
  // since schema_ai.sql references tables/functions created by schema.sql.
  const schemaFiles = ['schema.sql', 'schema_ai.sql'];

  const client = await pool.connect();
  try {
    logger.info('Running database migration...');
    for (const file of schemaFiles) {
      const sqlPath = path.join(__dirname, file);
      if (!fs.existsSync(sqlPath)) continue;
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      logger.info(`  → applying ${file}`);
      await client.query(sql);
    }
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
