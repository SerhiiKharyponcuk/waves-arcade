import type { ApiErrorDto } from "@waves/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

let accessToken = localStorage.getItem("waves_access_token") ?? "";

export function setAccessToken(token: string) {
  accessToken = token;
  if (token) {
    localStorage.setItem("waves_access_token", token);
  } else {
    localStorage.removeItem("waves_access_token");
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({
      message: "Request failed",
      code: "REQUEST_FAILED"
    }))) as ApiErrorDto;
    throw new Error(error.message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
