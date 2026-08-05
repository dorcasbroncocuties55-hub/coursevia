/**
 * supabaseFetch.ts
 * Raw fetch wrapper for Supabase REST API.
 * Used where the Supabase JS client stalls due to internal session issues.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type QueryOptions = {
  select?: string;
  filters?: Record<string, string>;   // column -> eq value
  orFilter?: string;                  // raw or() string e.g. "col1.eq.x,col2.eq.y"
  order?: { column: string; ascending: boolean };
  limit?: number;
  countOnly?: boolean;                // uses HEAD + Prefer: count=exact
};

/** Execute a SELECT query against a Supabase table via raw fetch. */
export async function dbQuery<T = any>(
  accessToken: string,
  table: string,
  options: QueryOptions = {}
): Promise<{ data: T[] | null; count: number | null; error: string | null }> {
  const {
    select = "*",
    filters = {},
    orFilter,
    order,
    limit,
    countOnly = false,
  } = options;

  const params = new URLSearchParams();
  if (!countOnly) params.set("select", select);

  for (const [col, val] of Object.entries(filters)) {
    params.set(col, `eq.${val}`);
  }
  if (orFilter) params.set("or", `(${orFilter})`);
  if (order) params.set(`order`, `${order.column}.${order.ascending ? "asc" : "desc"}`);
  if (limit) params.set("limit", String(limit));

  const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`;

  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
  };

  if (countOnly) {
    headers["Prefer"] = "count=exact";
  }

  try {
    const res = await fetch(url, {
      method: countOnly ? "HEAD" : "GET",
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { data: null, count: null, error: body || `HTTP ${res.status}` };
    }

    // Extract count from Content-Range header: "0-0/42" → 42
    const contentRange = res.headers.get("content-range");
    const count = contentRange ? parseInt(contentRange.split("/")[1] ?? "0", 10) : null;

    if (countOnly) return { data: null, count: count ?? 0, error: null };

    const data: T[] = await res.json();
    return { data, count, error: null };
  } catch (err: any) {
    return { data: null, count: null, error: err?.message ?? "Request failed" };
  }
}

/** Shorthand: get a single count from a table. Returns 0 on error. */
export async function dbCount(
  accessToken: string,
  table: string,
  filters: Record<string, string> = {},
  orFilter?: string
): Promise<number> {
  const { count } = await dbQuery(accessToken, table, {
    countOnly: true,
    filters,
    orFilter,
  });
  return count ?? 0;
}

/** Shorthand: get rows from a table. Returns [] on error. */
export async function dbRows<T = any>(
  accessToken: string,
  table: string,
  options: Omit<QueryOptions, "countOnly"> = {}
): Promise<T[]> {
  const { data } = await dbQuery<T>(accessToken, table, options);
  return data ?? [];
}
