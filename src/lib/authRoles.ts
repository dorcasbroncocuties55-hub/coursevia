import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_PRIORITY: AppRole[] = [
  "admin",
  "learner",
  "coach",
  "creator",
  "therapist",
];

export const isAppRole = (value: unknown): value is AppRole => {
  return (
    value === "admin" ||
    value === "learner" ||
    value === "coach" ||
    value === "creator" ||
    value === "therapist"
  );
};

export const parseRole = (value: unknown): AppRole | null => {
  return isAppRole(value) ? value : null;
};

export const normalizeRole = (value: unknown): AppRole | null => {
  return parseRole(value);
};

export const buildRoleList = (
  roles?: unknown,
  profileRole?: unknown,
  metadataRole?: unknown
): AppRole[] => {
  const roleSet = new Set<AppRole>();

  if (Array.isArray(roles)) {
    for (const role of roles) {
      const parsed = parseRole(role);
      if (parsed) roleSet.add(parsed);
    }
  }

  for (const value of [profileRole, metadataRole]) {
    const parsed = parseRole(value);
    if (parsed) roleSet.add(parsed);
  }

  return ROLE_PRIORITY.filter((role) => roleSet.has(role));
};

export const getPrimaryRole = (
  roles?: unknown,
  profileRole?: unknown,
  metadataRole?: unknown
): AppRole | null => {
  return buildRoleList(roles, profileRole, metadataRole)[0] ?? null;
};

export const roleToDashboardPath = (role?: unknown): string => {
  const normalized = parseRole(role);

  switch (normalized) {
    case "admin":
      return "/admin/dashboard";
    case "coach":
      return "/coach/dashboard";
    case "therapist":
      return "/therapist/dashboard";
    case "creator":
      return "/creator/dashboard";
    case "learner":
      return "/dashboard";
    default:
      return "/onboarding";
  }
};

/**
 * Resolves the best available first name for greeting the user.
 * Priority: profile.full_name → profile.display_name → user metadata name → fallback label.
 *
 * @param profile  - The profile object from AuthContext (or any partial shape with name fields).
 * @param user     - The Supabase User object (for metadata fallback).
 * @param fallback - Role-specific fallback string shown when no name is available (e.g. "Learner").
 */
export const getFirstName = (
  profile: { full_name?: string | null; display_name?: string | null } | null | undefined,
  user: { user_metadata?: { full_name?: string; name?: string } } | null | undefined,
  fallback: string,
): string => {
  const raw =
    profile?.full_name?.trim() ||
    profile?.display_name?.trim() ||
    (typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "") ||
    (typeof user?.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "");

  if (!raw) return fallback;
  return raw.split(" ")[0];
};
