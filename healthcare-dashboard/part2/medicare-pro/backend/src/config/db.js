import pkg from 'pg';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pkg;

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New PostgreSQL client connected');
});

export async function checkDbConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('✅ PostgreSQL connection verified');
    return true;
  } finally {
    client.release();
  }
}

export default pool;
