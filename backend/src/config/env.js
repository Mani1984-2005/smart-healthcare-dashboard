import dotenv from 'dotenv';
dotenv.config();

function resolveClientOrigin() {
  if (process.env.CLIENT_ORIGIN) {
    const list = process.env.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
    return list.length === 1 ? list[0] : list;
  }
  return process.env.NODE_ENV === 'production'
    ? 'http://localhost:8080'
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];
}

function resolvePort() {
  if (process.env.BACKEND_PORT) return Number(process.env.BACKEND_PORT);
  if (process.env.NODE_ENV === 'production' && process.env.PORT) return Number(process.env.PORT);
  return 5000;
}

export const env = {
  port: resolvePort(),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: resolveClientOrigin(),

  db: {
    // PostgreSQL connection target. There are deliberately NO default
    // credentials: falling back to "postgres/postgres" is a well-known
    // insecure default that has no place in a healthcare system. Missing
    // values fall through to standard libpq resolution (PG* env vars,
    // ~/.pgpass, OS user) and any misconfiguration surfaces as a REAL
    // connection/authentication error — never as a silent fallback.
    // The migration runner additionally requires an explicit MIGRATION_TARGET
    // declaration before it will touch any database (see config/migrationTarget.js).
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || undefined,
    password: process.env.PGPASSWORD || undefined,
    database: process.env.PGDATABASE || undefined,
  },

  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 15),
  ocrLang: process.env.OCR_LANG || 'eng',

  isProd: (process.env.NODE_ENV || 'development') === 'production',
};
