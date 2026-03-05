import { create } from "zustand";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface UserProfile {
  id: string;
  full_name: string;
  role: "admin" | "manager" | "staff";
  is_active: boolean;
  avatar_color: string;
  team_members?: {
    team_id: string;
    role: string;
    teams: {
      id: string;
      name: string;
      color: string;
    } | null;
    team_permissions?: Record<string, boolean> | null;
  }[];
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

    const {
      data: { session },
    } = await supabase.auth.getSession();

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
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  },

  // Signup is open. We enforce admin for self-signup accounts.
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

    // Best-effort safety net in case DB trigger policy wasn't updated yet.
    const { error: profileUpsertError } = await supabase
      .from("user_profiles")
      .upsert({
        id: sessionUser.id,
        full_name,
        role: "admin",
        is_active: true,
        avatar_color: randomProfileColor(),
      });

    if (profileUpsertError) {
      console.warn(
        "Failed to enforce admin role for new signup",
        profileUpsertError.message,
      );
    }

    await fetchAndSetProfile(sessionUser, set);
  },

  signOut: async () => {
    await supabase.auth.signOut();
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
    const profile = await getProfileWithRetry(user.id);

    const { data: memberships, error: membershipError } = await supabase
      .from("team_members")
      .select(
        `
        team_id,
        role,
        teams ( id, name, color )
      `,
      )
      .eq("user_id", user.id)
      .limit(1);

    if (membershipError) {
      throw membershipError;
    }

    let perms: Record<string, boolean> | null = null;
    if (memberships?.[0]?.team_id) {
      const { data: teamPermissions } = await supabase
        .from("team_permissions")
        .select("*")
        .eq("team_id", memberships[0].team_id)
        .maybeSingle();
      perms = (teamPermissions as Record<string, boolean>) || null;
    }

    const mergedProfile: UserProfile | null = profile
      ? {
          ...(profile as UserProfile),
          team_members:
            memberships?.map((m: any) => ({
              team_id: m.team_id,
              role: m.role,
              teams: normalizeTeam(m.teams),
              team_permissions: perms,
            })) || [],
        }
      : null;

    // If a super admin email is configured, ensure this account is admin.
    const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
    const shouldForceAdmin = !!superAdminEmail && user.email === superAdminEmail;

    if (shouldForceAdmin && mergedProfile && mergedProfile.role !== "admin") {
      await supabase
        .from("user_profiles")
        .update({ role: "admin" })
        .eq("id", user.id);
      mergedProfile.role = "admin";
    }

    set({
      user,
      profile: mergedProfile,
      loading: false,
      isAdmin: mergedProfile?.role === "admin" || shouldForceAdmin,
      isManager:
        mergedProfile?.role === "manager" || mergedProfile?.role === "admin",
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

async function getProfileWithRetry(userId: string, retries = 6, delayMs = 300) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, full_name, role, is_active, avatar_color")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}

function normalizeTeam(teamValue: any) {
  if (!teamValue) return null;
  if (Array.isArray(teamValue)) {
    return teamValue[0] || null;
  }
  return teamValue;
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
