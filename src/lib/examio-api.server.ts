import "server-only";

export function getExamioApiUrl(): string {
  const configuredUrl = process.env.EXAMIO_API_URL?.trim();
  if (!configuredUrl) {
    throw new Error("EXAMIO_API_URL no está definida");
  }

  const parsedUrl = new URL(configuredUrl);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("EXAMIO_API_URL debe usar http o https");
  }

  return parsedUrl.toString().replace(/\/$/, "");
}

export function examioApiEndpoint(pathname: string): string {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    throw new Error("La ruta de Examio API no es válida");
  }

  return `${getExamioApiUrl()}${pathname}`;
}

