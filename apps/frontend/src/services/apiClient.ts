import type { ApiErrorDto } from "@waves/shared";
import { i18n } from "../i18n";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const GET_CACHE_TTL_MS = 12_000;

let accessToken = localStorage.getItem("waves_access_token") ?? "";
const getCache = new Map<string, { expiresAt: number; data?: unknown; promise?: Promise<unknown> }>();

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    email: i18n.t("auth.email", { defaultValue: "Email" }),
    password: i18n.t("auth.password", { defaultValue: "Password" }),
    displayName: i18n.t("auth.displayName", { defaultValue: "Display name" }),
    locale: i18n.t("settings.language", { defaultValue: "Language" }),
    termsAccepted: i18n.t("terms.title", { defaultValue: "Terms" }),
    website: i18n.t("auth.securityVerification", { defaultValue: "Security check" }),
    formStartedAt: i18n.t("auth.securityVerification", { defaultValue: "Security check" }),
    subject: i18n.t("support.subject", { defaultValue: "Subject" }),
    message: i18n.t("support.message", { defaultValue: "Message" }),
    token: i18n.t("auth.verificationCode", { defaultValue: "Reset token" })
  };

  return labels[field] ?? field;
}

function formatApiError(error: ApiErrorDto) {
  const fieldMessages = Object.entries(error.fields ?? {})
    .flatMap(([field, messages]) => messages.map((message) => `${fieldLabel(field)}: ${message}`))
    .join(" ");

  return fieldMessages || error.message;
}

export function setAccessToken(token: string) {
  accessToken = token;
  getCache.clear();
  if (token) {
    localStorage.setItem("waves_access_token", token);
  } else {
    localStorage.removeItem("waves_access_token");
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isCacheableGet = method === "GET" && !options.body;
  const cacheKey = `${accessToken}:${path}`;
  const cached = isCacheableGet ? getCache.get(cacheKey) : undefined;

  if (cached) {
    if (cached.data !== undefined && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    if (cached.promise) {
      return cached.promise as Promise<T>;
    }
  }

  if (!isCacheableGet) {
    getCache.clear();
  }

  const requestPromise = (async () => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({
        message: i18n.t("common.error", { defaultValue: "Request failed" }),
        code: "REQUEST_FAILED"
      }))) as ApiErrorDto;
      throw new ApiRequestError(formatApiError(error), response.status, error.code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  })();

  if (isCacheableGet) {
    getCache.set(cacheKey, { expiresAt: Date.now() + GET_CACHE_TTL_MS, promise: requestPromise });
  }

  try {
    const data = await requestPromise;
    if (isCacheableGet) {
      getCache.set(cacheKey, { expiresAt: Date.now() + GET_CACHE_TTL_MS, data });
    }
    return data;
  } catch (error) {
    if (isCacheableGet) {
      getCache.delete(cacheKey);
    }
    throw error;
  }
}
