// backend/src/db/oracle.js
import oracledb from "oracledb";

let pool;

export async function initOraclePool() {
  if (pool) return pool;
  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
  });
  console.log("✅ Oracle pool ready");
  return pool;
}

export async function getConnection() {
  if (!pool) await initOraclePool();
  return await pool.getConnection();
}

export async function closeOraclePool() {
  if (pool) {
    await pool.close(0);
    pool = undefined;
  }
}
