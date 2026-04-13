export type ProviderServiceMode = "online" | "in_person" | "both";
export type ProviderCalendarMode = "open_schedule" | "provider_calendar";

export const PROVIDER_SERVICE_MODE_OPTIONS = [
  {
    value: "online" as ProviderServiceMode,
    label: "Online only",
    description: "Clients book virtual sessions and join the session room online.",
  },
  {
    value: "in_person" as ProviderServiceMode,
    label: "In-person only",
    description: "Clients request an in-person appointment and receive your contact number after booking.",
  },
  {
    value: "both" as ProviderServiceMode,
    label: "Online + In-person",
    description: "Offer both virtual and physical sessions from the same profile.",
  },
];

export const PROVIDER_CALENDAR_MODE_OPTIONS = [
  {
    value: "open_schedule" as ProviderCalendarMode,
    label: "Open schedule",
    description: "Let learners request both online and in-person times more freely.",
  },
  {
    value: "provider_calendar" as ProviderCalendarMode,
    label: "Provider booking calendar",
    description: "Force bookings to use your saved availability calendar.",
  },
];

export const getServiceModeLabel = (value?: string | null) => {
  switch (value) {
    case "online":
      return "Online";
    case "in_person":
      return "In-person";
    case "both":
      return "Online + In-person";
    default:
      return "Not set";
  }
};

export const getCalendarModeLabel = (value?: string | null) => {
  switch (value) {
    case "open_schedule":
      return "Open schedule";
    case "provider_calendar":
      return "Provider calendar";
    default:
      return "Standard";
  }
};
