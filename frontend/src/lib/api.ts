import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

const api = axios.create({
  baseURL: API_URL,
});

let cachedAccessToken: string | null = null;
let pendingAccessTokenLookup: Promise<string | null> | null = null;

async function loadAccessToken(): Promise<string | null> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  if (!pendingAccessTokenLookup) {
    pendingAccessTokenLookup = supabase.auth
      .getSession()
      .then(({ data }) => {
        const token = data.session?.access_token || null;
        cachedAccessToken = token;
        return token;
      })
      .catch(() => null)
      .finally(() => {
        pendingAccessTokenLookup = null;
      });
  }

  return pendingAccessTokenLookup;
}

supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token || null;
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const accessToken = await loadAccessToken();
  if (accessToken) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

export default api;
