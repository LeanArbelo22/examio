export class ApiError extends Error {
  public statusCode: number;
  public errors?: Array<{ code: string; path: string[]; message: string }>;

  constructor(message: string, statusCode: number, errors?: Array<{ code: string; path: string[]; message: string }>) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("examio_api_token");
  } catch {
    return null;
  }
}

export function setApiToken(token: string): void {
  try {
    localStorage.setItem("examio_api_token", token);
  } catch {
    console.error("No se pudo almacenar el token de API");
  }
}

export function clearApiToken(): void {
  try {
    localStorage.removeItem("examio_api_token");
  } catch {
    console.error("No se pudo limpiar el token de API");
  }
}

const API_URL = "http://localhost:55803/api";

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let result: any;
  try {
    result = await response.json();
  } catch {
    throw new ApiError(`Error parsing server response (${response.status})`, response.status);
  }

  if (!response.ok || result?.success === false) {
    throw new ApiError(
      result?.message || `Error ${response.status} en la petición a la API`,
      response.status,
      result?.errors
    );
  }

  return result.data as T;
}
