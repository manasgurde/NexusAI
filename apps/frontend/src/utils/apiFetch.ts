"use client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

/**
 * Authenticated fetch — requests backend API with session cookies.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  getToken?: () => Promise<string | null>
): Promise<Response> {
  let token: string | null = null;

  if (getToken) {
    token = await getToken();
  }

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}
