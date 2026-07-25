import type { SessionAuthError } from "@/types/auth";

export interface ApiValidationError {
  code: string;
  path: Array<string | number>;
  message: string;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  code?: string;
  errors?: ApiValidationError[];
}

interface BrowserSession {
  user?: unknown;
  authError?: SessionAuthError;
}

export interface ApiRequestInit extends RequestInit {
  timeoutMs?: number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly errors?: ApiValidationError[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let sessionRefreshPromise: Promise<BrowserSession> | null = null;

function normalizeFetchError(error: unknown, timedOut = false): ApiError {
  if (error instanceof ApiError) return error;
  if (timedOut) {
    return new ApiError(
      "La solicitud superó el tiempo de espera",
      408,
      "REQUEST_TIMEOUT",
    );
  }
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return new ApiError(
      "La solicitud fue cancelada",
      499,
      "REQUEST_ABORTED",
    );
  }
  return new ApiError(
    "No se pudo establecer conexión con Examio",
    0,
    "NETWORK_UNAVAILABLE",
  );
}

function requestSignal(
  externalSignal: AbortSignal | null | undefined,
  timeoutMs: number,
): {
  signal: AbortSignal;
  cleanup: () => void;
  didTimeout: () => boolean;
} {
  const controller = new AbortController();
  let timedOut = false;

  const abortFromCaller = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) {
    abortFromCaller();
  } else {
    externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abortFromCaller);
    },
  };
}

function defaultErrorCode(status: number): string {
  if (status === 400 || status === 422) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER_ERROR";
  return "HTTP_ERROR";
}

function validateEndpoint(endpoint: string): void {
  if (
    !endpoint.startsWith("/") ||
    endpoint.startsWith("//") ||
    endpoint.includes("://")
  ) {
    throw new ApiError("Endpoint de API inválido", 400, "BFF_PATH_INVALID");
  }
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const responseText = await response.text();
  if (!responseText) return {};

  try {
    return JSON.parse(responseText) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(
      `La API devolvió una respuesta inválida (${response.status})`,
      response.status,
      "API_RESPONSE_INVALID",
    );
  }
}

async function refreshBrowserSession(): Promise<BrowserSession> {
  if (typeof window === "undefined") {
    throw new ApiError(
      "La sesión no puede actualizarse fuera del navegador",
      401,
      "SESSION_UNAVAILABLE",
    );
  }

  if (!sessionRefreshPromise) {
    const composedSignal = requestSignal(undefined, DEFAULT_REQUEST_TIMEOUT_MS);
    sessionRefreshPromise = fetch("/api/auth/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal: composedSignal.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new ApiError(
            "No se pudo actualizar la sesión",
            response.status,
            "AUTH_INFRASTRUCTURE_ERROR",
          );
        }
        return (await response.json()) as BrowserSession;
      })
      .catch((error: unknown) => {
        throw normalizeFetchError(error);
      })
      .finally(() => {
        composedSignal.cleanup();
        sessionRefreshPromise = null;
      });
  }

  return sessionRefreshPromise;
}

function canReplayBody(body: BodyInit | null | undefined): boolean {
  return (
    body === null ||
    body === undefined ||
    typeof ReadableStream === "undefined" ||
    !(body instanceof ReadableStream)
  );
}

function statusForSessionError(error: SessionAuthError): number {
  if (error === "REFRESH_CONFLICT") return 409;
  if (error === "RATE_LIMITED") return 429;
  if (error === "AUTH_INFRASTRUCTURE_ERROR") return 503;
  if (error === "AUTH_CONTRACT_ERROR") return 502;
  return 401;
}

async function executeApiRequest<T>(
  endpoint: string,
  options: ApiRequestInit,
  allowRefreshRetry: boolean,
): Promise<T> {
  const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, signal: callerSignal, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  if (fetchOptions.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new ApiError(
      "El tiempo de espera configurado es inválido",
      400,
      "REQUEST_TIMEOUT_INVALID",
    );
  }

  const composedSignal = requestSignal(callerSignal, timeoutMs);
  let response: Response;
  try {
    response = await fetch(`/api/examio${endpoint}`, {
      ...fetchOptions,
      credentials: "same-origin",
      headers,
      signal: composedSignal.signal,
    });
  } catch (error: unknown) {
    throw normalizeFetchError(error, composedSignal.didTimeout());
  } finally {
    composedSignal.cleanup();
  }
  const result = await parseEnvelope<T>(response);

  if (
    response.status === 401 &&
    result.code === "ACCESS_TOKEN_EXPIRED" &&
    allowRefreshRetry &&
    canReplayBody(fetchOptions.body)
  ) {
    const session = await refreshBrowserSession();
    if (session.authError) {
      throw new ApiError(
        "No se pudo renovar la sesión",
        statusForSessionError(session.authError),
        session.authError,
      );
    }
    if (!session.user) {
      throw new ApiError(
        "La sesión ya no está disponible",
        401,
        "SESSION_UNAVAILABLE",
      );
    }

    return executeApiRequest<T>(endpoint, options, false);
  }

  if (!response.ok || result.success === false) {
    throw new ApiError(
      result.message || `Error ${response.status} en la petición a la API`,
      response.status,
      result.code || defaultErrorCode(response.status),
      result.errors,
    );
  }

  return result.data as T;
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiRequestInit = {},
): Promise<T> {
  validateEndpoint(endpoint);
  return executeApiRequest<T>(endpoint, options, true);
}
