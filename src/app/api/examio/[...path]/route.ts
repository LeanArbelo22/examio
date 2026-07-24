import { type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { examioApiEndpoint } from "@/lib/examio-api.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "content-type",
  "idempotency-key",
] as const;
const FORWARDED_RESPONSE_HEADERS = ["content-type", "retry-after"] as const;

function bffError(status: number, code: string, message: string): Response {
  return Response.json({ success: false, code, message }, { status });
}

function safeApiPath(segments: string[]): string | null {
  if (segments.length === 0) return null;

  const encodedSegments: string[] = [];
  for (const segment of segments) {
    if (
      !segment ||
      segment === "." ||
      segment === ".." ||
      segment.includes("/") ||
      segment.includes("\\")
    ) {
      return null;
    }
    encodedSegments.push(encodeURIComponent(segment));
  }

  return `/${encodedSegments.join("/")}`;
}

async function handler(request: NextRequest, context: RouteContext): Promise<Response> {
  if (!ALLOWED_METHODS.has(request.method)) {
    return bffError(405, "BFF_METHOD_NOT_ALLOWED", "Método no permitido");
  }

  const { path } = await context.params;
  const apiPath = safeApiPath(path);
  if (!apiPath) {
    return bffError(400, "BFF_PATH_INVALID", "Ruta de API inválida");
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return bffError(401, "SESSION_UNAVAILABLE", "No hay una sesión autenticada");
  }

  const headers = new Headers();
  for (const headerName of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(headerName);
    if (value) headers.set(headerName, value);
  }
  headers.set("Authorization", `Bearer ${token.accessToken}`);

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET") {
    const requestBody = await request.arrayBuffer();
    if (requestBody.byteLength > 0) body = requestBody;
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(
      `${examioApiEndpoint(apiPath)}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body,
        cache: "no-store",
        redirect: "manual",
      },
    );
  } catch {
    return bffError(
      503,
      "BFF_UPSTREAM_UNAVAILABLE",
      "La API de Examio no está disponible temporalmente",
    );
  }

  const responseHeaders = new Headers();
  for (const headerName of FORWARDED_RESPONSE_HEADERS) {
    const value = upstreamResponse.headers.get(headerName);
    if (value) responseHeaders.set(headerName, value);
  }
  responseHeaders.set("Cache-Control", "no-store");

  return new Response(await upstreamResponse.arrayBuffer(), {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
