import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw/server";
import { ApiError, apiFetch } from "./api";

const origin = "http://localhost:3000";

describe("apiFetch", () => {
  it("envía una escritura al BFF y devuelve data del envelope", async () => {
    server.use(
      http.post(`${origin}/api/examio/intentos/guardar-respuesta`, async ({ request }) => {
        expect(request.credentials).toBe("same-origin");
        expect(request.headers.get("content-type")).toBe("application/json");
        expect(await request.json()).toEqual({ IdIntento: 73, Respuesta: "A" });
        return HttpResponse.json({ success: true, data: { guardada: true } });
      }),
    );

    await expect(
      apiFetch<{ guardada: boolean }>("/intentos/guardar-respuesta", {
        method: "POST",
        body: JSON.stringify({ IdIntento: 73, Respuesta: "A" }),
      }),
    ).resolves.toEqual({ guardada: true });
  });

  it("admite una respuesta exitosa sin cuerpo", async () => {
    server.use(
      http.delete(`${origin}/api/examio/recurso/1`, () => new HttpResponse(null, { status: 204 })),
    );

    await expect(apiFetch<void>("/recurso/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("preserva código, mensaje y errores de validación", async () => {
    server.use(
      http.post(`${origin}/api/examio/evaluaciones`, () =>
        HttpResponse.json(
          {
            success: false,
            message: "Revisá los datos ingresados",
            code: "REQUEST_INVALID",
            errors: [{ code: "too_small", path: ["Titulo"], message: "Título requerido" }],
          },
          { status: 400 },
        ),
      ),
    );

    await expect(apiFetch("/evaluaciones", { method: "POST" })).rejects.toMatchObject({
      statusCode: 400,
      code: "REQUEST_INVALID",
      message: "Revisá los datos ingresados",
      errors: [{ code: "too_small", path: ["Titulo"], message: "Título requerido" }],
    } satisfies Partial<ApiError>);
  });

  it("normaliza JSON inválido sin ocultar el status", async () => {
    server.use(
      http.get(
        `${origin}/api/examio/recurso-roto`,
        () => new HttpResponse("<html>upstream roto</html>", { status: 502 }),
      ),
    );

    await expect(apiFetch("/recurso-roto")).rejects.toMatchObject({
      statusCode: 502,
      code: "API_RESPONSE_INVALID",
    } satisfies Partial<ApiError>);
  });

  it("no intenta renovar ante un 403 funcional", async () => {
    const sessionHandler = vi.fn(() => HttpResponse.json({ user: { name: "Docente" } }));
    server.use(
      http.get(`${origin}/api/auth/session`, sessionHandler),
      http.get(`${origin}/api/examio/reportes/restringido`, () =>
        HttpResponse.json(
          { success: false, code: "REPORT_SCOPE_FORBIDDEN", message: "Fuera de alcance" },
          { status: 403 },
        ),
      ),
    );

    await expect(apiFetch("/reportes/restringido")).rejects.toMatchObject({
      statusCode: 403,
      code: "REPORT_SCOPE_FORBIDDEN",
    } satisfies Partial<ApiError>);
    expect(sessionHandler).not.toHaveBeenCalled();
  });

  it("no intenta renovar un 401 que no representa access token vencido", async () => {
    const sessionHandler = vi.fn(() => HttpResponse.json({ user: { name: "Alumno" } }));
    server.use(
      http.get(`${origin}/api/auth/session`, sessionHandler),
      http.get(`${origin}/api/examio/recurso`, () =>
        HttpResponse.json(
          { success: false, code: "ACCESS_TOKEN_INVALID", message: "Token inválido" },
          { status: 401 },
        ),
      ),
    );

    await expect(apiFetch("/recurso")).rejects.toMatchObject({
      statusCode: 401,
      code: "ACCESS_TOKEN_INVALID",
    } satisfies Partial<ApiError>);
    expect(sessionHandler).not.toHaveBeenCalled();
  });

  it("actualiza la sesión y repite una escritura exactamente una vez", async () => {
    let attempts = 0;
    const sessionHandler = vi.fn(() => HttpResponse.json({ user: { name: "Alumno" } }));
    server.use(
      http.get(`${origin}/api/auth/session`, sessionHandler),
      http.post(`${origin}/api/examio/intentos/guardar-respuesta`, async ({ request }) => {
        attempts += 1;
        expect(await request.json()).toEqual({ IdIntento: 73, Respuesta: "texto" });
        if (attempts === 1) {
          return HttpResponse.json(
            { success: false, code: "ACCESS_TOKEN_EXPIRED", message: "Token vencido" },
            { status: 401 },
          );
        }
        return HttpResponse.json({ success: true, data: { guardada: true } });
      }),
    );

    await expect(
      apiFetch("/intentos/guardar-respuesta", {
        method: "POST",
        body: JSON.stringify({ IdIntento: 73, Respuesta: "texto" }),
      }),
    ).resolves.toEqual({ guardada: true });
    expect(attempts).toBe(2);
    expect(sessionHandler).toHaveBeenCalledOnce();
  });

  it("detiene el flujo si la actualización devuelve un error de sesión tipado", async () => {
    let attempts = 0;
    server.use(
      http.get(`${origin}/api/auth/session`, () =>
        HttpResponse.json({ user: { name: "Alumno" }, authError: "REFRESH_TOKEN_REVOKED" }),
      ),
      http.get(`${origin}/api/examio/preguntas`, () => {
        attempts += 1;
        return HttpResponse.json(
          { success: false, code: "ACCESS_TOKEN_EXPIRED", message: "Token vencido" },
          { status: 401 },
        );
      }),
    );

    await expect(apiFetch("/preguntas")).rejects.toMatchObject({
      statusCode: 401,
      code: "REFRESH_TOKEN_REVOKED",
    } satisfies Partial<ApiError>);
    expect(attempts).toBe(1);
  });

  it("no crea un loop si el reintento también recibe ACCESS_TOKEN_EXPIRED", async () => {
    let attempts = 0;
    server.use(
      http.get(`${origin}/api/auth/session`, () => HttpResponse.json({ user: { name: "Alumno" } })),
      http.get(`${origin}/api/examio/preguntas`, () => {
        attempts += 1;
        return HttpResponse.json(
          { success: false, code: "ACCESS_TOKEN_EXPIRED", message: "Token vencido" },
          { status: 401 },
        );
      }),
    );

    await expect(apiFetch("/preguntas")).rejects.toMatchObject({
      statusCode: 401,
      code: "ACCESS_TOKEN_EXPIRED",
    } satisfies Partial<ApiError>);
    expect(attempts).toBe(2);
  });

  it("comparte una sola actualización de sesión entre requests concurrentes", async () => {
    const attempts = new Map<string, number>();
    const sessionHandler = vi.fn(async () => {
      await delay(20);
      return HttpResponse.json({ user: { name: "Alumno" } });
    });
    server.use(
      http.get(`${origin}/api/auth/session`, sessionHandler),
      http.get(`${origin}/api/examio/datos/:id`, ({ params }) => {
        const id = String(params.id);
        const attempt = (attempts.get(id) ?? 0) + 1;
        attempts.set(id, attempt);
        return attempt === 1
          ? HttpResponse.json(
              { success: false, code: "ACCESS_TOKEN_EXPIRED", message: "Token vencido" },
              { status: 401 },
            )
          : HttpResponse.json({ success: true, data: { id } });
      }),
    );

    await expect(
      Promise.all([apiFetch("/datos/uno"), apiFetch("/datos/dos")]),
    ).resolves.toEqual([{ id: "uno" }, { id: "dos" }]);
    expect(sessionHandler).toHaveBeenCalledOnce();
    expect(attempts).toEqual(new Map([["uno", 2], ["dos", 2]]));
  });

  it("distingue timeout, cancelación externa y pérdida de red", async () => {
    server.use(
      http.get(`${origin}/api/examio/lento`, async () => {
        await delay("infinite");
        return HttpResponse.json({ success: true });
      }),
      http.get(`${origin}/api/examio/sin-red`, () => HttpResponse.error()),
    );

    await expect(apiFetch("/lento", { timeoutMs: 10 })).rejects.toMatchObject({
      statusCode: 408,
      code: "REQUEST_TIMEOUT",
    } satisfies Partial<ApiError>);

    const controller = new AbortController();
    controller.abort();
    await expect(apiFetch("/lento", { signal: controller.signal })).rejects.toMatchObject({
      statusCode: 499,
      code: "REQUEST_ABORTED",
    } satisfies Partial<ApiError>);

    await expect(apiFetch("/sin-red")).rejects.toMatchObject({
      statusCode: 0,
      code: "NETWORK_UNAVAILABLE",
    } satisfies Partial<ApiError>);
  });

  it("rechaza endpoints que podrían evitar el BFF", async () => {
    await expect(apiFetch("https://example.com/api")).rejects.toMatchObject({
      code: "BFF_PATH_INVALID",
    } satisfies Partial<ApiError>);
    await expect(apiFetch("//example.com/api")).rejects.toMatchObject({
      code: "BFF_PATH_INVALID",
    } satisfies Partial<ApiError>);
  });
});
