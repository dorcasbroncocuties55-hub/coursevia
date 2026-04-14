import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { buildRoleList, getPrimaryRole, parseRole, type AppRole } from "@/lib/authRoles";

type Profile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean | null;
  email?: string | null;
  role?: AppRole | null;
  bio?: string | null;
  phone?: string | null;
  country?: string | null;
  kyc_status?: string | null;
  is_verified?: boolean | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshAll: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const OAUTH_ROLE_STORAGE_KEY = "coursevia_oauth_role";

const getStoredRequestedRole = (): AppRole | null => {
  if (typeof window === "undefined") return null;
  return parseRole(window.localStorage.getItem(OAUTH_ROLE_STORAGE_KEY));
};

const clearStoredRequestedRole = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(OAUTH_ROLE_STORAGE_KEY);
};

const getUserDisplayName = (authUser: User) => {
  const fullName = typeof authUser.user_metadata?.full_name === "string" ? authUser.user_metadata.full_name.trim() : "";
  const name = typeof authUser.user_metadata?.name === "string" ? authUser.user_metadata.name.trim() : "";
  return fullName || name || authUser.email?.split("@")[0] || "User";
};

const logSupabaseError = (label: string, error: any) => {
  if (!error) return;
  console.error(label, {
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    code: error.code ?? null,
    status: error.status ?? null,
    full: error,
  });
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const syncingRef = useRef(false);
  const lastSyncedUserIdRef = useRef<string | null>(null);
  const initialSessionHandledRef = useRef(false);

  const clearAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
    lastSyncedUserIdRef.current = null;
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, onboarding_completed, email, role, bio, phone, country, kyc_status, is_verified")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logSupabaseError("fetchProfile error:", error);
      setProfile(null);
      return null;
    }

    const nextProfile = (data as Profile | null) ?? null;
    setProfile(nextProfile);
    return nextProfile;
  };

  const fetchRoles = async (userId: string, profileRole?: AppRole | null, metadataRole?: AppRole | null) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      logSupabaseError("fetchRoles error:", error);
      const fallbackRoles = buildRoleList([], profileRole, metadataRole);
      setRoles(fallbackRoles);
      return fallbackRoles;
    }

    const nextRoles = buildRoleList(
      (data?.map((item) => parseRole(item.role)).filter(Boolean) as AppRole[] | undefined) ?? [],
      profileRole,
      metadataRole,
    );

    setRoles(nextRoles);
    return nextRoles;
  };

  const ensureProfileRecord = async (authUser: User, resolvedRole: AppRole | null) => {
    const avatarUrl = typeof authUser.user_metadata?.avatar_url === "string"
      ? authUser.user_metadata.avatar_url
      : typeof authUser.user_metadata?.picture === "string"
        ? authUser.user_metadata.picture
        : null;

    const fullName = getUserDisplayName(authUser);

    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, email, role, onboarding_completed, bio, phone, country, kyc_status, is_verified")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (profileLookupError) {
      logSupabaseError("ensureProfileRecord profile lookup error:", profileLookupError);
      return parseRole(existingProfile?.role) || resolvedRole || null;
    }

    if (existingProfile) {
      return parseRole(existingProfile.role) || resolvedRole || null;
    }

    const profilePayload: Database["public"]["Tables"]["profiles"]["Insert"] = {
      user_id: authUser.id,
      email: authUser.email ?? null,
      full_name: fullName,
      avatar_url: avatarUrl,
      onboarding_completed: false,
      status: "active",
      ...(resolvedRole ? { role: resolvedRole } : {}),
    };

    const { error: insertProfileError } = await supabase.from("profiles").insert(profilePayload);

    if (insertProfileError) {
      if (insertProfileError.code === "23505" || insertProfileError.status === 409) {
        return resolvedRole || null;
      }
      logSupabaseError("ensureProfileRecord insert profile error:", insertProfileError);
    }

    return resolvedRole || null;
  };

  const ensureRoleRecord = async (authUser: User, role: AppRole | null) => {
    if (!role) return null;

    const { data: existingRole, error: lookupError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("user_id", authUser.id)
      .eq("role", role)
      .maybeSingle();

    if (lookupError) {
      logSupabaseError("ensureRoleRecord lookup role error:", lookupError);
      return role;
    }

    if (existingRole) return role;

    const payload: Database["public"]["Tables"]["user_roles"]["Insert"] = {
      user_id: authUser.id,
      role,
    };

    const { error } = await supabase.from("user_roles").insert(payload);

    if (error) {
      if (error.code === "23505" || error.status === 409) {
        return role;
      }
      logSupabaseError("ensureRoleRecord create role error:", error);
    }

    return role;
  };

  const ensureUserMetadata = async (authUser: User, role: AppRole | null) => {
    if (!role) return;

    const currentRequestedRole = parseRole(authUser.user_metadata?.requested_role);
    const currentRole = parseRole(authUser.user_metadata?.role);
    const currentAccountType = parseRole(authUser.user_metadata?.account_type);

    if (
      currentRequestedRole === role &&
      currentRole === role &&
      currentAccountType === role
    ) {
      return;
    }

    const {
      data: { session: liveSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      logSupabaseError("ensureUserMetadata getSession error:", sessionError);
      return;
    }

    if (!liveSession?.user || liveSession.user.id !== authUser.id) return;

    const { error } = await supabase.auth.updateUser({
      data: {
        requested_role: role,
        role,
        account_type: role,
        provider_type: role === "learner" ? null : role,
      },
    });

    if (error && !String(error.message || "").includes("User from sub claim in JWT does not exist")) {
      logSupabaseError("ensureUserMetadata update metadata error:", error);
    }
  };

  const ensureUserRecords = async (authUser: User) => {
    const requestedRole =
      parseRole(authUser.user_metadata?.requested_role) ||
      parseRole(authUser.user_metadata?.role) ||
      parseRole(authUser.user_metadata?.account_type) ||
      getStoredRequestedRole();

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (existingProfileError) {
      logSupabaseError("ensureUserRecords existing profile role lookup error:", existingProfileError);
    }

    const existingRole = parseRole(existingProfile?.role);
    const resolvedRole = requestedRole || existingRole || "learner";

    await Promise.allSettled([
      ensureProfileRecord(authUser, resolvedRole),
      ensureRoleRecord(authUser, resolvedRole),
      ensureUserMetadata(authUser, resolvedRole),
    ]);

    return resolvedRole;
  };

  const syncAuthState = async (nextSession: Session | null) => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        clearAuthState();
        return;
      }

      const currentUserId = nextSession.user.id;
      const metadataRole = parseRole(nextSession.user.user_metadata?.requested_role);

      if (lastSyncedUserIdRef.current === currentUserId) {
        const nextProfile = await fetchProfile(currentUserId);
        await fetchRoles(currentUserId, parseRole(nextProfile?.role), metadataRole);
        return;
      }

      const ensuredRole = await ensureUserRecords(nextSession.user);
      const nextProfile = await fetchProfile(currentUserId);

      await fetchRoles(currentUserId, parseRole(nextProfile?.role), ensuredRole || metadataRole);

      lastSyncedUserIdRef.current = currentUserId;

      if (nextProfile?.onboarding_completed) {
        clearStoredRequestedRole();
      }
    } catch (err) {
      console.error("syncAuthState error:", err);
    } finally {
      syncingRef.current = false;
    }
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  };

  const refreshRoles = async () => {
    if (!user?.id) return;
    await fetchRoles(user.id, parseRole(profile?.role), parseRole(user.user_metadata?.requested_role));
  };

  const refreshAll = async () => {
    if (!user?.id) return;
    const nextProfile = await fetchProfile(user.id);
    await fetchRoles(user.id, parseRole(nextProfile?.role), parseRole(user.user_metadata?.requested_role));
  };

  const logout = async () => {
    setLoading(true);
    clearStoredRequestedRole();

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("logout error:", error);
    }

    clearAuthState();
    setLoading(false);
    window.location.href = "/login";
  };

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      setLoading(true);

      // Skip session restoration on the auth callback page —
      // AuthCallback.tsx handles everything there
      if (window.location.pathname === "/auth/callback") {
        if (mounted) setLoading(false);
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          logSupabaseError("exchangeCodeForSession error:", exchangeError);
        }

        url.searchParams.delete("code");
        window.history.replaceState({}, document.title, url.toString());
      }

      const {
        data: { session: nextSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        logSupabaseError("getSession error:", error);
      }

      // If we have a session but the user was deleted from Supabase,
      // the profile fetch will fail - auto logout in that case
      if (nextSession?.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", nextSession.user.id)
          .maybeSingle();
        
        if (profileError?.code === "PGRST301") {
          // User deleted - clear everything and redirect
          try { await supabase.auth.signOut({ scope: "local" }); } catch {}
          try { window.localStorage.clear(); window.sessionStorage.clear(); } catch {}
          if (mounted) {
            clearAuthState();
            setLoading(false);
            window.location.href = "/login";
          }
          return;
        }
      }

      if (!mounted) return;

      await syncAuthState(nextSession ?? null);

      if (mounted) {
        initialSessionHandledRef.current = true;
        setLoading(false);
      }
    };

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      // Let AuthCallback.tsx handle everything on the callback page
      if (window.location.pathname === "/auth/callback") return;

      if (event === "INITIAL_SESSION" && initialSessionHandledRef.current) {
        return;
      }

      if (event === "SIGNED_OUT") {
        clearStoredRequestedRole();
        clearAuthState();
        setLoading(false);
        return;
      }

      await syncAuthState(nextSession ?? null);

      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const primaryRole = useMemo<AppRole | null>(
    () => getPrimaryRole(roles, profile?.role, user?.user_metadata?.requested_role),
    [roles, profile?.role, user?.user_metadata?.requested_role],
  );

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      roles,
      primaryRole,
      loading,
      refreshProfile,
      refreshRoles,
      refreshAll,
      logout,
    }),
    [user, session, profile, roles, primaryRole, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
