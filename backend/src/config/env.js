import dotenv from 'dotenv';
dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

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
    host: required('PGHOST', 'localhost'),
    port: Number(process.env.PGPORT || 5432),
    user: required('PGUSER', 'postgres'),
    password: required('PGPASSWORD', 'postgres'),
    database: required('PGDATABASE', 'medicare_pro'),
  },

  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 15),
  ocrLang: process.env.OCR_LANG || 'eng',

  isProd: (process.env.NODE_ENV || 'development') === 'production',
};
