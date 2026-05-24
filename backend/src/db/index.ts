import { Pool } from 'pg';
import { env } from '../config/env';

const isProductionOrSupabase = env.DATABASE_URL.includes('supabase.co') || env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ...(isProductionOrSupabase && {
    ssl: { rejectUnauthorized: false }
  })
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
