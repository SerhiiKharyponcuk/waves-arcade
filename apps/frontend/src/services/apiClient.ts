import type { ApiErrorDto } from "@waves/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

let accessToken = localStorage.getItem("waves_access_token") ?? "";

const fieldLabels: Record<string, string> = {
  email: "Email",
  password: "Password",
  displayName: "Display name",
  locale: "Language",
  termsAccepted: "Terms",
  website: "Security check",
  formStartedAt: "Security check",
  subject: "Subject",
  message: "Message",
  token: "Reset token"
};

function formatApiError(error: ApiErrorDto) {
  const fieldMessages = Object.entries(error.fields ?? {})
    .flatMap(([field, messages]) => messages.map((message) => `${fieldLabels[field] ?? field}: ${message}`))
    .join(" ");

  return fieldMessages || error.message;
}

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
    throw new Error(formatApiError(error));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
