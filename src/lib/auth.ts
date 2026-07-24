import crypto from "crypto";
import type { NextAuthOptions, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { decode } from "jsonwebtoken";
import { examioApiEndpoint } from "@/lib/examio-api.server";
import {
  TERMINAL_SESSION_ERRORS,
  type SessionAuthError,
  type UserRole,
} from "@/types/auth";

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000;
const NEXTAUTH_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

interface ApiUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  identificadorInstitucional?: number | null;
  idAlumno?: number | null;
  idDocente?: number | null;
}

interface LoginData {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  user: ApiUser;
}

interface RefreshData {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

interface RefreshedAccessClaims {
  id?: number;
  email?: string;
  role?: UserRole;
  idAlumno?: number | null;
  idDocente?: number | null;
}

const refreshPromises = new Map<string, Promise<JWT>>();

function parseExpiration(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function deterministicIdempotencyKey(refreshToken: string): string {
  const bytes = crypto
    .createHash("sha256")
    .update(`examio-nextauth-refresh:${refreshToken}`)
    .digest()
    .subarray(0, 16);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function refreshKey(refreshToken: string): string {
  return crypto.createHash("sha256").update(refreshToken).digest("hex");
}

function safeAuthError(code: string | undefined, status: number): SessionAuthError {
  switch (code) {
    case "REFRESH_CONFLICT":
    case "REFRESH_TOKEN_INVALID":
    case "REFRESH_TOKEN_EXPIRED":
    case "REFRESH_TOKEN_REVOKED":
    case "REFRESH_TOKEN_REUSED":
    case "SESSION_REVOKED":
    case "USER_INACTIVE":
    case "RATE_LIMITED":
    case "AUTH_INFRASTRUCTURE_ERROR":
    case "AUTH_CONTRACT_ERROR":
      return code;
    default:
      return status >= 500 ? "AUTH_INFRASTRUCTURE_ERROR" : "AUTH_CONTRACT_ERROR";
  }
}

function safeLoginError(code: string | undefined, status: number): string {
  switch (code) {
    case "USER_INACTIVE":
    case "SESSION_REVOKED":
    case "RATE_LIMITED":
      return code;
    default:
      return status >= 500
        ? "AUTH_INFRASTRUCTURE_ERROR"
        : "AUTH_CONTRACT_ERROR";
  }
}

function applyRefreshedClaims(token: JWT, accessToken: string): JWT {
  const claims = decode(accessToken) as RefreshedAccessClaims | null;
  if (!claims || !claims.id || !claims.email || !claims.role) {
    return token;
  }

  return {
    ...token,
    id: String(claims.id),
    email: claims.email,
    role: claims.role,
    idAlumno: claims.idAlumno ?? undefined,
    idDocente: claims.idDocente ?? undefined,
    identificadorInstitucional:
      claims.role === "alumno"
        ? claims.idAlumno ?? undefined
        : claims.role === "docente"
          ? claims.idDocente ?? undefined
          : undefined,
  };
}

async function performRefresh(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(examioApiEndpoint("/auth/refresh"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": deterministicIdempotencyKey(token.refreshToken),
      },
      body: JSON.stringify({ RefreshToken: token.refreshToken }),
      cache: "no-store",
    });

    const body = await readEnvelope<RefreshData>(response);
    if (!body) {
      return { ...token, authError: "AUTH_CONTRACT_ERROR" };
    }
    if (!response.ok || !body.success || !body.data) {
      return {
        ...token,
        authError: safeAuthError(body.code, response.status),
      };
    }

    const accessTokenExpiresAt = parseExpiration(body.data.accessTokenExpiresAt);
    const refreshTokenExpiresAt = parseExpiration(body.data.refreshTokenExpiresAt);
    if (
      !body.data.accessToken ||
      !body.data.refreshToken ||
      accessTokenExpiresAt === null ||
      refreshTokenExpiresAt === null
    ) {
      return { ...token, authError: "AUTH_CONTRACT_ERROR" };
    }

    const updatedIdentity = applyRefreshedClaims(token, body.data.accessToken);
    return {
      ...updatedIdentity,
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      authError: undefined,
    };
  } catch {
    return { ...token, authError: "AUTH_INFRASTRUCTURE_ERROR" };
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  const key = refreshKey(token.refreshToken);
  const existing = refreshPromises.get(key);
  if (existing) return existing;

  const refreshPromise = performRefresh(token).finally(() => {
    refreshPromises.delete(key);
  });
  refreshPromises.set(key, refreshPromise);
  return refreshPromise;
}

function shouldRefresh(token: JWT): boolean {
  return Date.now() >= token.accessTokenExpiresAt - ACCESS_TOKEN_REFRESH_BUFFER_MS;
}

function hasTerminalSessionError(error: SessionAuthError | undefined): boolean {
  return Boolean(error && TERMINAL_SESSION_ERRORS.has(error));
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        let response: Response;
        try {
          response = await fetch(examioApiEndpoint("/auth/login"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              Email: credentials.email.trim(),
              Password: credentials.password,
            }),
            cache: "no-store",
          });
        } catch {
          throw new Error("AUTH_INFRASTRUCTURE_ERROR");
        }

        const body = await readEnvelope<LoginData>(response);
        if (!body) {
          throw new Error("AUTH_CONTRACT_ERROR");
        }
        if (!response.ok || !body.success || !body.data) {
          if (body.code === "INVALID_CREDENTIALS") return null;
          throw new Error(safeLoginError(body.code, response.status));
        }

        const accessTokenExpiresAt = parseExpiration(body.data.accessTokenExpiresAt);
        const refreshTokenExpiresAt = parseExpiration(body.data.refreshTokenExpiresAt);
        if (
          !body.data.accessToken ||
          !body.data.refreshToken ||
          !body.data.user ||
          accessTokenExpiresAt === null ||
          refreshTokenExpiresAt === null
        ) {
          throw new Error("AUTH_CONTRACT_ERROR");
        }

        const { user } = body.data;
        const mappedUser: User = {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          identificadorInstitucional: user.identificadorInstitucional ?? undefined,
          idAlumno: user.idAlumno ?? undefined,
          idDocente: user.idDocente ?? undefined,
          accessToken: body.data.accessToken,
          refreshToken: body.data.refreshToken,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
        };

        return mappedUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          role: user.role,
          identificadorInstitucional: user.identificadorInstitucional,
          idAlumno: user.idAlumno,
          idDocente: user.idDocente,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpiresAt: user.accessTokenExpiresAt,
          refreshTokenExpiresAt: user.refreshTokenExpiresAt,
          authError: undefined,
        };
      }

      if (!token.accessToken || !token.refreshToken || !token.accessTokenExpiresAt) {
        return { ...token, authError: "AUTH_CONTRACT_ERROR" };
      }
      if (!shouldRefresh(token)) {
        return token;
      }
      if (hasTerminalSessionError(token.authError)) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.identificadorInstitucional = token.identificadorInstitucional;
        session.user.idAlumno = token.idAlumno;
        session.user.idDocente = token.idDocente;
      }
      session.authError = token.authError;
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (!token?.refreshToken) return;

      try {
        await fetch(examioApiEndpoint("/auth/logout"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token.accessToken
              ? { Authorization: `Bearer ${token.accessToken}` }
              : {}),
          },
          body: JSON.stringify({ RefreshToken: token.refreshToken }),
          cache: "no-store",
        });
      } catch {
        // El cierre local de NextAuth no debe quedar bloqueado por una API caída.
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: NEXTAUTH_SESSION_MAX_AGE_SECONDS,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
