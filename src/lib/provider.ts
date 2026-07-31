export const isProviderProfile = (profile: any) => {
  return (
    profile?.account_type === "provider" ||
    profile?.provider_type === "coach" ||
    profile?.provider_type === "therapist"
  );
};

export const getProviderLabel = (profile: any) => {
  if (profile?.provider_type === "therapist") return "Therapist";
  if (profile?.provider_type === "coach") return "Coach";
  return "Provider";
};

export const getProviderHeadline = (profile: any) => {
  if (profile?.headline?.trim()) return profile.headline;
  if (profile?.provider_type === "therapist") {
    return "Professional therapist helping clients with guided support sessions.";
  }
  if (profile?.provider_type === "coach") {
    return "Professional coach helping learners grow with practical sessions.";
  }
  return "Experienced provider available for sessions and support.";
};

export const getProviderSpecialties = (profile: any): string[] => {
  if (Array.isArray(profile?.specialties)) return profile.specialties;
  if (typeof profile?.specialties === "string" && profile.specialties.trim()) {
    return profile.specialties
      .split(",")
      .map((item: string) => item.trim())
      .filter(Boolean);
  }

  if (profile?.provider_type === "therapist") {
    return ["Wellness", "Guided Support", "Client Care"];
  }

  if (profile?.provider_type === "coach") {
    return ["Coaching", "Growth", "Strategy"];
  }

  return ["Professional Support"];
};