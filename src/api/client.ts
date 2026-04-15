const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function postJson<T>(
  path: string,
  body: unknown,
  opts?: { token?: string | null }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts?.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    const msg =
      (data as { message?: string }).message ??
      (data as { error?: string }).error ??
      res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

export async function getJson<T>(
  path: string,
  opts?: { token?: string | null }
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts?.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }
  const res = await fetch(apiUrl(path), { headers });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    const msg =
      (data as { message?: string }).message ??
      (data as { error?: string }).error ??
      res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

export async function patchJson<T>(
  path: string,
  body: unknown,
  opts?: { token?: string | null }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts?.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }
  const res = await fetch(apiUrl(path), {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    const msg =
      (data as { message?: string }).message ??
      (data as { error?: string }).error ??
      res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

export async function deleteJson<T>(
  path: string,
  opts?: { token?: string | null }
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts?.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }
  const res = await fetch(apiUrl(path), {
    method: "DELETE",
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    const msg =
      (data as { message?: string }).message ??
      (data as { error?: string }).error ??
      res.statusText;
    throw new Error(msg);
  }
  return data as T;
}
