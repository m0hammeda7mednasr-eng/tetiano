import { create } from "zustand";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import api, { setApiAccessToken } from "../lib/api";

export interface UserProfile {
  id: string;
  full_name: string;
  role: "admin" | "manager" | "staff" | "owner" | "operator" | "user" | "viewer";
  store_role?: "admin" | "manager" | "staff" | "viewer";
  store_id?: string | null;
  is_active: boolean;
  avatar_color: string;
  permissions?: string[] | Record<string, boolean> | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  isAdmin: boolean;
  isManager: boolean;
  permissions: Record<string, boolean> | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, full_name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (key: string) => boolean;
}

let authListenerRegistered = false;
let initializePromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  isAdmin: false,
  isManager: false,
  permissions: null,

  initialize: async () => {
    if (get().initialized) {
      return;
    }

    if (!initializePromise) {
      initializePromise = (async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setApiAccessToken(session?.access_token || null);

        if (session?.user) {
          await fetchAndSetProfile(session.user, set);
        } else {
          set({
            user: null,
            profile: null,
            isAdmin: false,
            isManager: false,
            permissions: null,
            loading: false,
          });
        }

        if (!authListenerRegistered) {
          supabase.auth.onAuthStateChange(async (_event, authSession) => {
            setApiAccessToken(authSession?.access_token || null);
            if (authSession?.user) {
              await fetchAndSetProfile(authSession.user, set);
            } else {
              set({
                user: null,
                profile: null,
                isAdmin: false,
                isManager: false,
                permissions: null,
                loading: false,
              });
            }
          });
          authListenerRegistered = true;
        }

        set({ initialized: true });
      })().finally(() => {
        initializePromise = null;
      });
    }

    await initializePromise;
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  },

  // Signup is open. Owner role is assigned during bootstrap.
  signUp: async (email: string, password: string, full_name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
      },
    });

    if (error) throw error;

    const sessionUser = data.session?.user;
    if (!sessionUser) {
      return;
    }

    // Best-effort profile row creation before backend bootstrap.
    const baseProfilePayload = {
      id: sessionUser.id,
      full_name,
      is_active: true,
      avatar_color: randomProfileColor(),
    };

    let profileUpsert = await supabase.from("user_profiles").upsert({
      ...baseProfilePayload,
      role: "admin",
    });
    if (profileUpsert.error && isSchemaCompatibilityError(profileUpsert.error)) {
      profileUpsert = await supabase.from("user_profiles").upsert(baseProfilePayload);
    }

    if (profileUpsert.error) {
      console.warn(
        "Failed to seed profile for new signup",
        profileUpsert.error.message,
      );
    }

    await fetchAndSetProfile(sessionUser, set);
  },

  signOut: async () => {
    await supabase.auth.signOut();
    setApiAccessToken(null);
    set({
      user: null,
      profile: null,
      isAdmin: false,
      isManager: false,
      permissions: null,
      loading: false,
    });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (user) {
      await fetchAndSetProfile(user, set);
    }
  },

  hasPermission: (key: string) => {
    const { isAdmin, permissions } = get();
    if (isAdmin) return true;
    return permissions?.[key] === true;
  },
}));

async function fetchAndSetProfile(
  user: User,
  set: (state: Partial<AuthState>) => void,
) {
  try {
    let profile = await getProfileFromApi(user.id);
    if (!profile) {
      profile = await getProfileWithRetry(user.id);
    }

    if (!resolveProfileStoreId(profile)) {
      try {
        const didBootstrap = await tryBootstrapStore();
        if (didBootstrap) {
          profile = (await getProfileFromApi(user.id)) || (await getProfileWithRetry(user.id, 6, 250));
        }
      } catch (bootstrapError) {
        console.warn("Store bootstrap failed", bootstrapError);
      }
    }

    const normalizedRole = normalizeRole(profile?.store_role || profile?.role);
    const profilePermissions = toPermissionMap(profile?.permissions);
    const perms = mergePermissionMaps(
      profilePermissions,
      buildRoleFallbackPermissions(normalizedRole),
    );

    if (perms?.can_adjust_inventory && perms.can_edit_inventory === undefined) {
      perms.can_edit_inventory = true;
    }

    const mergedProfile: UserProfile | null = profile
      ? ({ ...(profile as UserProfile) })
      : null;

    const effectiveRole = normalizedRole;

    set({
      user,
      profile: mergedProfile,
      loading: false,
      isAdmin: effectiveRole === "admin",
      isManager: effectiveRole === "manager" || effectiveRole === "admin",
      permissions: perms,
    });
  } catch (err) {
    console.error("Profile fetch failed", err);
    set({
      user,
      profile: null,
      isAdmin: false,
      isManager: false,
      permissions: null,
      loading: false,
    });
  }
}

async function getProfileWithRetry(userId: string, retries = 2, delayMs = 250) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!error) {
      return data || null;
    }

    if (!isSchemaCompatibilityError(error)) {
      break;
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}

async function getProfileFromApi(userId: string): Promise<UserProfile | null> {
  try {
    const { data } = await api.get("/api/app/me");
    const profile = data?.profile ?? null;
    const user = data?.user ?? null;
    const store = data?.store ?? null;

    if (!profile && !user) return null;

    return {
      id: String(profile?.id || user?.id || userId),
      full_name: String(profile?.full_name || user?.email?.split?.("@")?.[0] || "User"),
      role: normalizeRole(profile?.store_role || user?.store_role || profile?.role),
      store_role: normalizeStoreRole(profile?.store_role || user?.store_role || profile?.role),
      store_id: resolveApiStoreId(profile, store),
      is_active: profile?.is_active !== false,
      avatar_color: String(profile?.avatar_color || randomProfileColor()),
      permissions: user?.permissions || profile?.permissions || null,
    };
  } catch (error: any) {
    if (isExpectedApiFallbackError(error)) {
      return null;
    }
    throw error;
  }
}

async function tryBootstrapStore(): Promise<boolean> {
  try {
    await api.post("/api/onboarding/bootstrap-store");
    return true;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return false;
    }
    throw error;
  }
}

function resolveProfileStoreId(profile: any): string | null {
  return profile?.store_id || null;
}

function resolveApiStoreId(profile: any, store: any): string | null {
  return profile?.store_id || store?.id || null;
}

function isExpectedApiFallbackError(error: any): boolean {
  const status = Number(error?.response?.status || 0);
  return status === 400 || status === 401 || status === 403 || status === 404 || status === 503;
}

function isSchemaCompatibilityError(error: any): boolean {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    text.includes("column") ||
    text.includes("null value") ||
    text.includes("violates not-null") ||
    text.includes("relation") ||
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("unknown relationship")
  );
}

function normalizeRole(role: unknown): "admin" | "manager" | "staff" {
  const value = typeof role === "string" ? role.toLowerCase() : "";
  if (value === "admin" || value === "owner") return "admin";
  if (value === "manager") return "manager";
  return "staff";
}

function normalizeStoreRole(role: unknown): "admin" | "manager" | "staff" | "viewer" {
  const value = typeof role === "string" ? role.toLowerCase() : "";
  if (value === "admin" || value === "owner") return "admin";
  if (value === "manager") return "manager";
  if (value === "viewer") return "viewer";
  return "staff";
}

function toPermissionMap(value: unknown): Record<string, boolean> | null {
  if (Array.isArray(value)) {
    const mapped = value.reduce<Record<string, boolean>>((acc, permission) => {
      if (typeof permission === "string" && permission.trim()) {
        acc[permission.trim()] = true;
      }
      return acc;
    }, {});
    return Object.keys(mapped).length > 0 ? mapped : null;
  }

  if (value && typeof value === "object") {
    const mapped = Object.entries(value as Record<string, unknown>).reduce<Record<string, boolean>>(
      (acc, [key, raw]) => {
        if (typeof raw === "boolean") {
          acc[key] = raw;
        }
        return acc;
      },
      {},
    );
    return Object.keys(mapped).length > 0 ? mapped : null;
  }

  return null;
}

function buildRoleFallbackPermissions(role: "admin" | "manager" | "staff"): Record<string, boolean> | null {
  if (role === "admin") return null;

  if (role === "manager") {
    return {
      can_view_inventory: true,
      can_edit_inventory: true,
      can_view_orders: true,
      can_submit_reports: true,
      can_view_reports: true,
    };
  }

  return {
    can_view_inventory: true,
    can_submit_reports: true,
  };
}

function mergePermissionMaps(
  ...maps: Array<Record<string, boolean> | null>
): Record<string, boolean> | null {
  const merged = maps.reduce<Record<string, boolean>>((acc, map) => {
    if (!map) return acc;
    Object.assign(acc, map);
    return acc;
  }, {});

  return Object.keys(merged).length > 0 ? merged : null;
}

function randomProfileColor() {
  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}
