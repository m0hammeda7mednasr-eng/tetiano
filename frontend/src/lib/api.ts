import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

const api = axios.create({
  baseURL: API_URL,
});

let cachedAccessToken: string | null = null;
let authListenerRegistered = false;

export function setApiAccessToken(token: string | null): void {
  cachedAccessToken = token || null;
}

function ensureAuthListener(): void {
  if (authListenerRegistered) return;

  supabase.auth.onAuthStateChange((_event, session) => {
    setApiAccessToken(session?.access_token || null);
  });

  authListenerRegistered = true;
}

ensureAuthListener();

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (cachedAccessToken) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${cachedAccessToken}`;
  }

  return config;
});

export default api;
