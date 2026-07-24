import type { SessionAuthError } from "@/types/auth";

interface ApiValidationError {
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
    sessionRefreshPromise = fetch("/api/auth/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
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
      .finally(() => {
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
  options: RequestInit,
  allowRefreshRetry: boolean,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api/examio${endpoint}`, {
    ...options,
    credentials: "same-origin",
    headers,
  });
  const result = await parseEnvelope<T>(response);

  if (
    response.status === 401 &&
    result.code === "ACCESS_TOKEN_EXPIRED" &&
    allowRefreshRetry &&
    canReplayBody(options.body)
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
      result.code,
      result.errors,
    );
  }

  return result.data as T;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  validateEndpoint(endpoint);
  return executeApiRequest<T>(endpoint, options, true);
}
