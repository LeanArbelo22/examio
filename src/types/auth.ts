import type { UserRole } from "./shared";

export type { UserRole } from "./shared";

export interface LoginPayload {
  Email: string;
  Password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    identificadorInstitucional?: number;
  };
}

export type SessionAuthError =
  | "REFRESH_CONFLICT"
  | "REFRESH_TOKEN_INVALID"
  | "REFRESH_TOKEN_EXPIRED"
  | "REFRESH_TOKEN_REVOKED"
  | "REFRESH_TOKEN_REUSED"
  | "SESSION_REVOKED"
  | "USER_INACTIVE"
  | "RATE_LIMITED"
  | "AUTH_INFRASTRUCTURE_ERROR"
  | "AUTH_CONTRACT_ERROR";

export const TERMINAL_SESSION_ERRORS: ReadonlySet<SessionAuthError> = new Set([
  "REFRESH_TOKEN_INVALID",
  "REFRESH_TOKEN_EXPIRED",
  "REFRESH_TOKEN_REVOKED",
  "REFRESH_TOKEN_REUSED",
  "SESSION_REVOKED",
  "USER_INACTIVE",
]);
