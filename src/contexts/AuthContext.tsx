import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { PostgrestError } from "@supabase/supabase-js";
import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { buildRoleList, getPrimaryRole, parseRole, type AppRole } from "@/lib/authRoles";

// ---------------------------------------------------------------------------
// All profile columns fetched from Supabase — single source of truth.
// Used by both fetchProfile and ensureProfileRecord to stay in sync.
// ---------------------------------------------------------------------------
const PROFILE_SELECT_FIELDS = [
  "user_id", "full_name", "display_name", "avatar_url", "onboarding_completed",
  "email", "role", "bio", "phone", "country", "city", "kyc_status", "is_verified",
  "profession", "headline", "experience", "certification",
  "specialization_type", "specialization_slug", "languages",
  "services_offered", "works_with", "expertise_areas", "service_areas",
  "service_delivery_mode", "calendar_mode", "meeting_preference",
  "office_address", "enable_phone_release",
  "business_name", "business_email", "business_phone", "business_website",
  "business_address", "business_description",
  "learner_goal", "learner_looking_forward", "learner_interests",
  "profile_slug", "account_type", "status",
].join(", ");

// Minimal set used internally when we only care about role/onboarding state.
const PROFILE_ROLE_FIELDS = "user_id, role, onboarding_completed, full_name, display_name, avatar_url, email";

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
  city?: string | null;
  kyc_status?: string | null;
  is_verified?: boolean | null;
  display_name?: string | null;
  profession?: string | null;
  headline?: string | null;
  experience?: string | null;
  certification?: string | null;
  specialization_type?: string | null;
  specialization_slug?: string | null;
  languages?: string[] | null;
  services_offered?: string | null;
  works_with?: string | null;
  expertise_areas?: string | null;
  service_areas?: string | null;
  service_delivery_mode?: string | null;
  calendar_mode?: string | null;
  meeting_preference?: string | null;
  office_address?: string | null;
  enable_phone_release?: boolean | null;
  business_name?: string | null;
  business_email?: string | null;
  business_phone?: string | null;
  business_website?: string | null;
  business_address?: string | null;
  business_description?: string | null;
  learner_goal?: string | null;
  learner_looking_forward?: string | null;
  learner_interests?: string | null;
  profile_slug?: string | null;
  account_type?: string | null;
  status?: string | null;
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

const getUserDisplayName = (authUser: User): string | null => {
  const fullName = typeof authUser.user_metadata?.full_name === "string" ? authUser.user_metadata.full_name.trim() : "";
  const name = typeof authUser.user_metadata?.name === "string" ? authUser.user_metadata.name.trim() : "";
  // Return null for the generic fallback so we never write "User" or an email
  // prefix to the profile — those aren't real display names from the provider.
  return fullName || name || null;
};

// Accepts both PostgrestError and AuthError; falls back gracefully for unknown shapes.
const logSupabaseError = (label: string, error: PostgrestError | AuthError | null | undefined) => {
  if (!error) return;
  console.error(label, {
    message: "message" in error ? error.message : null,
    details: "details" in error ? (error as PostgrestError).details : null,
    hint: "hint" in error ? (error as PostgrestError).hint : null,
    code: "code" in error ? error.code : null,
    status: "status" in error ? error.status : null,
    full: error,
  });
};

/**
 * Returns true when `next` has a value and differs from `current`.
 * Covers both "field was empty" and "field changed in the provider".
 */
const shouldSync = (
  current: string | null | undefined,
  next: string | null | undefined,
): boolean => !!next && current !== next;

// ---------------------------------------------------------------------------
// Targeted auth-token key removal — consistent helper used everywhere.
// Never nukes unrelated localStorage keys.
// ---------------------------------------------------------------------------
const clearAuthTokens = () => {
  Object.keys(localStorage).forEach((key) => {
    if (
      (key.startsWith("sb-") && key.includes("-auth-token")) ||
      key.startsWith("supabase.auth.")
    ) {
      localStorage.removeItem(key);
    }
  });
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Generation counter: each syncAuthState call captures the current value at start.
  // If the counter increments (new call started or timeout fired) before we finish,
  // we know our result is stale and skip any further state updates.
  const syncGenRef = useRef(0);
  const syncingRef = useRef(false);
  const initialSessionHandledRef = useRef(false);

  const clearAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_FIELDS)
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

  // existingProfileData is passed in from ensureUserRecords to avoid a redundant DB fetch.
  const ensureProfileRecord = async (
    authUser: User,
    resolvedRole: AppRole | null,
    existingProfileData?: {
      user_id: string;
      role?: string | null;
      onboarding_completed?: boolean | null;
      full_name?: string | null;
      display_name?: string | null;
      avatar_url?: string | null;
      email?: string | null;
    } | null,
  ) => {
    const avatarUrl = typeof authUser.user_metadata?.avatar_url === "string"
      ? authUser.user_metadata.avatar_url
      : typeof authUser.user_metadata?.picture === "string"
        ? authUser.user_metadata.picture
        : null;

    const fullName = getUserDisplayName(authUser);

    // Use the pre-fetched profile if available; only hit the DB when we have to.
    let existingProfile = existingProfileData;
    if (existingProfile === undefined) {
      const { data, error: profileLookupError } = await supabase
        .from("profiles")
        .select(PROFILE_ROLE_FIELDS)
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (profileLookupError) {
        logSupabaseError("ensureProfileRecord profile lookup error:", profileLookupError);
        return parseRole(data?.role) || resolvedRole || null;
      }
      existingProfile = data;
    }

    if (existingProfile) {
      // Always sync mutable auth metadata to keep profile fresh after OAuth re-auth.
      // This handles cases where users update their name/avatar in Google/GitHub/etc.
      const needsNameUpdate = !existingProfile.full_name && !!fullName;
      const needsAvatarUpdate = !existingProfile.avatar_url && !!avatarUrl;
      const needsEmailUpdate = !existingProfile.email && !!authUser.email;

      // Also sync when existing values differ from auth (user changed them in provider)
      const nameChanged = existingProfile.full_name && fullName && existingProfile.full_name !== fullName;
      const avatarChanged = existingProfile.avatar_url && avatarUrl && existingProfile.avatar_url !== avatarUrl;
      const emailChanged = existingProfile.email && authUser.email && existingProfile.email !== authUser.email;

      if (needsNameUpdate || needsAvatarUpdate || needsEmailUpdate || nameChanged || avatarChanged || emailChanged) {
        const updatePayload: Record<string, string | null> = {};
        if (needsNameUpdate || nameChanged) updatePayload.full_name = fullName;
        if (needsAvatarUpdate || avatarChanged) updatePayload.avatar_url = avatarUrl;
        if (needsEmailUpdate || emailChanged) updatePayload.email = authUser.email ?? null;

        const { error: updateErr } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("user_id", authUser.id);

        if (updateErr) {
          logSupabaseError("ensureProfileRecord sync update error:", updateErr);
        }
      }

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
    // Single DB fetch for role/onboarding — result is passed down to
    // ensureProfileRecord so it doesn't need to fetch the row a second time.
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select(PROFILE_ROLE_FIELDS)
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (existingProfileError) {
      logSupabaseError("ensureUserRecords existing profile role lookup error:", existingProfileError);
    }

    const onboardingDone = existingProfile?.onboarding_completed === true;
    const existingRole = parseRole(existingProfile?.role);

    // Only resolve/write a role if onboarding is complete.
    // Pre-onboarding users have no role — it gets set by finishOnboarding.
    if (!onboardingDone) {
      // Pass the pre-fetched data down — avoids a second SELECT on the same row.
      await ensureProfileRecord(authUser, null, existingProfile ?? null);
      return null;
    }

    // Post-onboarding: use the role from profile, then metadata, never default to learner blindly
    const requestedRole =
      parseRole(authUser.user_metadata?.requested_role) ||
      parseRole(authUser.user_metadata?.role) ||
      parseRole(authUser.user_metadata?.account_type) ||
      getStoredRequestedRole();

    const resolvedRole = existingRole || requestedRole || "learner";

    await Promise.allSettled([
      // Pass pre-fetched profile data — no extra SELECT inside ensureProfileRecord.
      ensureProfileRecord(authUser, resolvedRole, existingProfile ?? null),
      ensureRoleRecord(authUser, resolvedRole),
      ensureUserMetadata(authUser, resolvedRole),
    ]);

    return resolvedRole;
  };

  const syncAuthState = async (nextSession: Session | null, { fullSync = true } = {}) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    let aborted = false;

    // Hard timeout — never block UI for more than 8 seconds
    const timeout = setTimeout(() => {
      aborted = true;
      syncingRef.current = false;
      setLoading(false);
    }, 8000);

    try {
      if (aborted) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        clearAuthState();
        return;
      }

      const currentUserId = nextSession.user.id;
      const metadataRole = parseRole(nextSession.user.user_metadata?.requested_role);

      // Only run ensureUserRecords (DB writes) on sign-in events, not on token refreshes.
      // This avoids 3-4 redundant DB round-trips on every TOKEN_REFRESHED event.
      let ensuredRole: AppRole | null = null;
      if (fullSync) {
        ensuredRole = await ensureUserRecords(nextSession.user);
      }

      if (aborted) return;
      const nextProfile = await fetchProfile(currentUserId);

      if (aborted) return;
      await fetchRoles(currentUserId, parseRole(nextProfile?.role), ensuredRole || metadataRole);

      if (nextProfile?.onboarding_completed) {
        clearStoredRequestedRole();
      }
    } catch (err) {
      console.error("syncAuthState error:", err);
    } finally {
      if (!aborted) clearTimeout(timeout);
      syncingRef.current = false;
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  }, [user?.id]);

  const refreshRoles = useCallback(async () => {
    if (!user?.id) return;
    await fetchRoles(user.id, parseRole(profile?.role), parseRole(user.user_metadata?.requested_role));
  }, [user?.id, profile?.role, user?.user_metadata?.requested_role]);

  const refreshAll = useCallback(async () => {
    if (!user?.id) return;
    const nextProfile = await fetchProfile(user.id);
    await fetchRoles(user.id, parseRole(nextProfile?.role), parseRole(user.user_metadata?.requested_role));
  }, [user?.id, user?.user_metadata?.requested_role]);

  const logout = useCallback(async () => {
    clearStoredRequestedRole();
    clearAuthTokens();
    // Clear React state immediately so UI updates
    clearAuthState();
    try {
      // Sign out globally with 4s timeout
      await Promise.race([
        supabase.auth.signOut({ scope: "global" }),
        new Promise(resolve => setTimeout(resolve, 4000)),
      ]);
    } catch (err) {
      console.warn("logout signOut error:", err);
    }
    window.location.replace("/");
  }, []);

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
      // the profile fetch will fail — auto logout in that case.
      if (nextSession?.user) {
        const { data: profileCheck, error: profileError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", nextSession.user.id)
          .maybeSingle();

        if (profileError?.code === "PGRST301") {
          // User deleted — clear tokens (targeted, not nuclear) and redirect.
          try { await supabase.auth.signOut({ scope: "local" }); } catch {}
          clearAuthTokens();
          sessionStorage.clear();
          if (mounted) {
            clearAuthState();
            setLoading(false);
            window.location.replace("/login");
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

      if (event === "INITIAL_SESSION" && initialSessionHandledRef.current) {
        return;
      }

      if (event === "SIGNED_OUT") {
        clearStoredRequestedRole();
        clearAuthState();
        setLoading(false);
        return;
      }

      // Only run DB writes (ensureUserRecords) on actual sign-in events.
      // TOKEN_REFRESHED and USER_UPDATED only need a lightweight profile/role refresh.
      const isSignInEvent = event === "SIGNED_IN" || event === "PASSWORD_RECOVERY";
      await syncAuthState(nextSession ?? null, { fullSync: isSignInEvent });

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
    [user, session, profile, roles, primaryRole, loading, refreshProfile, refreshRoles, refreshAll, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
