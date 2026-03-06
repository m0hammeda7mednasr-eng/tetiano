import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  logger.error('Missing Supabase environment variables', {
    hasUrl: !!SUPABASE_URL,
    hasServiceKey: !!SUPABASE_SERVICE_KEY,
  });
  throw new Error('Missing Supabase environment variables');
}

if (SUPABASE_SERVICE_KEY.includes('placeholder')) {
  logger.warn('Supabase service key looks like a placeholder value. Admin endpoints may fail.');
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Client for user-authenticated requests
export const createUserClient = (accessToken: string) => {
  return createClient(
    SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
};
