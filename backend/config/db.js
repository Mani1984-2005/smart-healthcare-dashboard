import pkg from "pg";
const { Pool } = pkg;

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.PG_HOST || "localhost",
      port: parseInt(process.env.PG_PORT || "5432"),
      database: process.env.PG_DATABASE || "medicare_pro",
      user: process.env.PG_USER || "postgres",
      password: process.env.PG_PASSWORD || "postgres",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export default getPool;
