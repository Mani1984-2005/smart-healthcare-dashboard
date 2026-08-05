import dotenv from 'dotenv';
dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

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
