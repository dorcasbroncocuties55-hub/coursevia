const DEFAULT_BACKEND_URL = "http://localhost:5000";

export const getBackendBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_BACKEND_URL || "").trim();
  return (envUrl || DEFAULT_BACKEND_URL).replace(/\/$/, "");
};

export const buildBackendUrl = (path: string) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getBackendBaseUrl()}${normalized}`;
};

export const backendRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(buildBackendUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Request failed: ${response.status}`);
  }

  return data as T;
};
