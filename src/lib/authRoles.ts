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
