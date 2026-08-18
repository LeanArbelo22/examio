import { delay, http, HttpResponse } from "msw";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw/server";
import { authOptions } from "./auth";

vi.mock("server-only", () => ({}));

const apiBase = "http://examio-api.test/api";
const originalApiUrl = process.env.EXAMIO_API_URL;

function futureIso(milliseconds: number): string {
  return new Date(Date.now() + milliseconds).toISOString();
}

function accessToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${payload}.test-signature`;
}

function token(overrides: Partial<JWT> = {}): JWT {
  return {
    id: "1",
    name: "Alumno",
    email: "alumno@examio.test",
    role: "alumno",
    identificadorInstitucional: 30123,
    idAlumno: 30123,
    accessToken: "access-anterior",
    refreshToken: "refresh-anterior",
    accessTokenExpiresAt: Date.now() + 5 * 60_000,
    refreshTokenExpiresAt: Date.now() + 12 * 60 * 60_000,
    ...overrides,
  };
}

function authorizeCredentials(
  credentials: Record<string, string>,
): Promise<User | null> {
  const provider = authOptions.providers[0];
  if (!provider || provider.type !== "credentials") {
    throw new Error("CredentialsProvider no está configurado");
  }
  const configured = provider as typeof provider & {
    options: {
      authorize: (
        credentials: Record<string, string> | undefined,
        request: never,
      ) => User | null | Promise<User | null>;
    };
  };
  return Promise.resolve(configured.options.authorize(credentials, {} as never));
}

async function runJwt(currentToken: JWT, user?: User): Promise<JWT> {
  const callback = authOptions.callbacks?.jwt;
  if (!callback) throw new Error("Callback JWT no configurado");
  return callback({ token: currentToken, user } as never) as Promise<JWT>;
}

async function runSession(currentSession: Session, currentToken: JWT): Promise<Session> {
  const callback = authOptions.callbacks?.session;
  if (!callback) throw new Error("Callback session no configurado");
  return callback({ session: currentSession, token: currentToken } as never) as Promise<Session>;
}

describe("NextAuth authOptions", () => {
  beforeAll(() => {
    process.env.EXAMIO_API_URL = apiBase;
  });

  afterAll(() => {
    if (originalApiUrl === undefined) delete process.env.EXAMIO_API_URL;
    else process.env.EXAMIO_API_URL = originalApiUrl;
  });

  beforeEach(() => vi.restoreAllMocks());

  it("autoriza login válido, normaliza email y conserva credenciales solo en User interno", async () => {
    server.use(
      http.post(`${apiBase}/auth/login`, async ({ request }) => {
        expect(await request.json()).toEqual({
          Email: "alumno@examio.test",
          Password: "secreto",
        });
        return HttpResponse.json({
          success: true,
          data: {
            accessToken: "access-login",
            refreshToken: "refresh-login",
            accessTokenExpiresAt: futureIso(15 * 60_000),
            refreshTokenExpiresAt: futureIso(12 * 60 * 60_000),
            user: {
              id: 1,
              email: "alumno@examio.test",
              name: "Alumno",
              role: "alumno",
              idAlumno: 30123,
              idDocente: null,
            },
          },
        });
      }),
    );

    const user = await authorizeCredentials({
      email: " alumno@examio.test ",
      password: "secreto",
    });

    expect(user).toMatchObject({
      id: "1",
      email: "alumno@examio.test",
      role: "alumno",
      idAlumno: 30123,
      accessToken: "access-login",
      refreshToken: "refresh-login",
    });
    expect(user?.accessTokenExpiresAt).toBeGreaterThan(Date.now());
  });

  it("devuelve null ante credenciales inválidas y tipa fallos de infraestructura", async () => {
    server.use(
      http.post(`${apiBase}/auth/login`, () =>
        HttpResponse.json(
          { success: false, code: "INVALID_CREDENTIALS", message: "Inválidas" },
          { status: 401 },
        ),
      ),
    );
    await expect(
      authorizeCredentials({
        email: "alumno@examio.test",
        password: "incorrecta",
      }),
    ).resolves.toBeNull();

    server.use(http.post(`${apiBase}/auth/login`, () => HttpResponse.error()));
    await expect(
      authorizeCredentials({
        email: "alumno@examio.test",
        password: "secreto",
      }),
    ).rejects.toThrow("AUTH_INFRASTRUCTURE_ERROR");
  });

  it("copia credenciales al JWT interno y nunca las expone en Session", async () => {
    const internalUser = {
      id: "1",
      name: "Alumno",
      email: "alumno@examio.test",
      role: "alumno",
      identificadorInstitucional: 30123,
      idAlumno: 30123,
      accessToken: "access-secreto",
      refreshToken: "refresh-secreto",
      accessTokenExpiresAt: Date.now() + 15 * 60_000,
      refreshTokenExpiresAt: Date.now() + 12 * 60 * 60_000,
    } satisfies User;
    const jwt = await runJwt(token(), internalUser);
    const session = await runSession(
      {
        expires: futureIso(12 * 60 * 60_000),
        user: { name: "Alumno", email: "alumno@examio.test", id: "", role: "alumno" },
      },
      jwt,
    );

    expect(jwt).toMatchObject({
      accessToken: "access-secreto",
      refreshToken: "refresh-secreto",
    });
    expect(session.user).toMatchObject({
      id: "1",
      role: "alumno",
      idAlumno: 30123,
    });
    expect(session).not.toHaveProperty("accessToken");
    expect(session).not.toHaveProperty("refreshToken");
    expect(session.user).not.toHaveProperty("accessToken");
    expect(session.user).not.toHaveProperty("refreshToken");
  });

  it("no renueva antes de la ventana y detiene refresh ante un error terminal", async () => {
    const handler = vi.fn(() => HttpResponse.json({ success: true }));
    server.use(http.post(`${apiBase}/auth/refresh`, handler));

    const fresh = token({ accessTokenExpiresAt: Date.now() + 2 * 60_000 });
    await expect(runJwt(fresh)).resolves.toBe(fresh);

    const terminal = token({
      accessTokenExpiresAt: Date.now() - 1,
      authError: "REFRESH_TOKEN_REVOKED",
    });
    await expect(runJwt(terminal)).resolves.toBe(terminal);
    expect(handler).not.toHaveBeenCalled();
  });

  it("rota credenciales, actualiza identidad y envía idempotencia estable", async () => {
    const idempotencyKeys: string[] = [];
    server.use(
      http.post(`${apiBase}/auth/refresh`, async ({ request }) => {
        idempotencyKeys.push(request.headers.get("idempotency-key") ?? "");
        expect(await request.json()).toEqual({ RefreshToken: "refresh-anterior" });
        return HttpResponse.json({
          success: true,
          data: {
            accessToken: accessToken({
              id: 2,
              email: "docente@examio.test",
              role: "docente",
              idAlumno: null,
              idDocente: 9001,
            }),
            refreshToken: "refresh-rotado",
            accessTokenExpiresAt: futureIso(15 * 60_000),
            refreshTokenExpiresAt: futureIso(12 * 60 * 60_000),
          },
        });
      }),
    );

    const refreshed = await runJwt(token({ accessTokenExpiresAt: Date.now() - 1 }));

    expect(refreshed).toMatchObject({
      id: "2",
      email: "docente@examio.test",
      role: "docente",
      idDocente: 9001,
      identificadorInstitucional: 9001,
      accessToken: expect.any(String),
      refreshToken: "refresh-rotado",
      authError: undefined,
    });
    expect(idempotencyKeys[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("agrupa renovaciones concurrentes del mismo refresh token", async () => {
    let calls = 0;
    server.use(
      http.post(`${apiBase}/auth/refresh`, async () => {
        calls += 1;
        await delay(30);
        return HttpResponse.json({
          success: true,
          data: {
            accessToken: accessToken({
              id: 1,
              email: "alumno@examio.test",
              role: "alumno",
              idAlumno: 30123,
            }),
            refreshToken: "refresh-rotado-concurrente",
            accessTokenExpiresAt: futureIso(15 * 60_000),
            refreshTokenExpiresAt: futureIso(12 * 60 * 60_000),
          },
        });
      }),
    );
    const expired = token({
      accessTokenExpiresAt: Date.now() - 1,
      refreshToken: "refresh-concurrente",
    });

    const [first, second] = await Promise.all([
      runJwt({ ...expired }),
      runJwt({ ...expired }),
    ]);

    expect(calls).toBe(1);
    expect(first.refreshToken).toBe("refresh-rotado-concurrente");
    expect(second.refreshToken).toBe("refresh-rotado-concurrente");
  });

  it("mapea refresh fallido y contrato inválido a errores seguros", async () => {
    server.use(
      http.post(`${apiBase}/auth/refresh`, () =>
        HttpResponse.json(
          { success: false, code: "REFRESH_TOKEN_REUSED", message: "Replay" },
          { status: 401 },
        ),
      ),
    );
    await expect(
      runJwt(token({ accessTokenExpiresAt: Date.now() - 1, refreshToken: "reused" })),
    ).resolves.toMatchObject({ authError: "REFRESH_TOKEN_REUSED" });

    server.use(
      http.post(`${apiBase}/auth/refresh`, () =>
        HttpResponse.json({ success: true, data: { accessToken: "incompleto" } }),
      ),
    );
    await expect(
      runJwt(token({ accessTokenExpiresAt: Date.now() - 1, refreshToken: "invalid-contract" })),
    ).resolves.toMatchObject({ authError: "AUTH_CONTRACT_ERROR" });
  });

  it("logout envía refresh y bearer sin bloquear el cierre local", async () => {
    const logout = authOptions.events?.signOut;
    if (!logout) throw new Error("Evento signOut no configurado");
    server.use(
      http.post(`${apiBase}/auth/logout`, async ({ request }) => {
        expect(request.headers.get("authorization")).toBe("Bearer access-anterior");
        expect(await request.json()).toEqual({ RefreshToken: "refresh-anterior" });
        return HttpResponse.json({ success: true });
      }),
    );
    await expect(logout({ token: token() } as never)).resolves.toBeUndefined();

    server.use(http.post(`${apiBase}/auth/logout`, () => HttpResponse.error()));
    await expect(logout({ token: token() } as never)).resolves.toBeUndefined();
  });
});
