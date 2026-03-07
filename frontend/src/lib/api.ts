import axios, { AxiosError } from "axios";
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds
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
    (config.headers as Record<string, string>).Authorization =
      `Bearer ${cachedAccessToken}`;
  }

  return config;
});

// Add response interceptor for error handling and retry logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;

    // Don't retry if no config or already retried
    if (!config || (config as any).__retryCount >= 2) {
      return Promise.reject(error);
    }

    // Initialize retry count
    (config as any).__retryCount = (config as any).__retryCount || 0;

    // Retry on network errors or 5xx errors
    const shouldRetry =
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600) ||
      error.code === "ECONNABORTED" ||
      error.code === "ERR_NETWORK";

    if (shouldRetry) {
      (config as any).__retryCount += 1;

      // Exponential backoff: 1s, 2s
      const delay = Math.pow(2, (config as any).__retryCount - 1) * 1000;

      await new Promise((resolve) => setTimeout(resolve, delay));

      return api(config);
    }

    return Promise.reject(error);
  },
);

export default api;
