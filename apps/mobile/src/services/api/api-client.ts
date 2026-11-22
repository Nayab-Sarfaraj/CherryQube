import { WEB_ORIGIN } from "../../lib/mobile-config";
import type { ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiClientConfig = {
  baseUrl?: string;
  getAuthToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
  fetchFn?: typeof fetch;
};

export function createApiClient(config: ApiClientConfig = {}) {
  const baseUrl = (config.baseUrl ?? WEB_ORIGIN).replace(/\/$/, "");
  const fetchFn = config.fetchFn ?? globalThis.fetch;

  async function request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: unknown;
      headers?: Record<string, string>;
      schema?: ZodType<T>;
    } = {},
  ): Promise<T> {
    const url = path.startsWith("http")
      ? path
      : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers,
    };

    if (config.getAuthToken) {
      const token = await config.getAuthToken().catch(() => null);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    let bodyData: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      bodyData = JSON.stringify(options.body);
    }

    const response = await fetchFn(url, {
      method: options.method ?? "GET",
      headers,
      body: bodyData,
    });

    if (response.status === 401) {
      config.onUnauthorized?.();
      const errorJson = await response.json().catch(() => null);
      const message =
        errorJson?.error?.message ?? "Please sign in to continue.";
      throw new ApiError(
        401,
        message,
        errorJson?.error?.code ?? "UNAUTHORIZED",
      );
    }

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      const message =
        errorJson?.error?.message ??
        `Request failed with status ${response.status}.`;
      throw new ApiError(response.status, message, errorJson?.error?.code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const json = await response.json();
    if (options.schema) {
      return options.schema.parse(json);
    }
    return json as T;
  }

  return {
    request,
    get: <T>(
      path: string,
      schema?: ZodType<T>,
      headers?: Record<string, string>,
    ) => request<T>(path, { method: "GET", schema, headers }),
    post: <T>(
      path: string,
      body?: unknown,
      schema?: ZodType<T>,
      headers?: Record<string, string>,
    ) => request<T>(path, { method: "POST", body, schema, headers }),
    put: <T>(
      path: string,
      body?: unknown,
      schema?: ZodType<T>,
      headers?: Record<string, string>,
    ) => request<T>(path, { method: "PUT", body, schema, headers }),
    delete: <T>(
      path: string,
      schema?: ZodType<T>,
      headers?: Record<string, string>,
    ) => request<T>(path, { method: "DELETE", schema, headers }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
