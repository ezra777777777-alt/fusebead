import { createPool, Pool } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    pool = createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "fusebead",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T;
}

export default getPool;
