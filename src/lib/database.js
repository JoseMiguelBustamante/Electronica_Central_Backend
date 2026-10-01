import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let pool;

const getPool = () => {
  if (!env.DATABASE_URL) return null;
  if (!pool) {
    pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false });
    pool.on('error', (error) => logger.error('database_pool_error', { message: error.message }));
  }
  return pool;
};

export const query = async (text, values = []) => {
  const database = getPool();
  if (!database) throw new Error('Database is not configured');
  return database.query(text, values);
};

export const withTransaction = async (callback) => {
  const database = getPool();
  if (!database) throw new Error('Database is not configured');
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const isDatabaseReady = async () => {
  try {
    if (!getPool()) return false;
    await query('SELECT 1');
    return true;
  } catch (error) {
    logger.warn('database_not_ready', { message: error.message });
    return false;
  }
};

export const closeDatabase = async () => {
  if (pool) await pool.end();
  pool = undefined;
};
