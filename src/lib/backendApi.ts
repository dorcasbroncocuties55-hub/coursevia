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

// Wake up the backend server (Render free tier spins down after inactivity)
// Call this on app load so it's warm by the time user needs payments
export const pingBackend = async (): Promise<boolean> => {
  try {
    const res = await fetch(buildBackendUrl("/health"), {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
};

// Retry a backend call with wake-up logic
export const backendRequestWithRetry = async <T>(
  path: string,
  init?: RequestInit,
  retries = 2
): Promise<T> => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await backendRequest<T>(path, init);
    } catch (err: any) {
      const isNetworkError =
        err?.message?.includes("fetch") ||
        err?.message?.includes("Failed to fetch") ||
        err?.message?.includes("NetworkError");

      if (isNetworkError && i < retries) {
        // Server is cold-starting — wait and retry
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Backend unavailable after retries");
};
