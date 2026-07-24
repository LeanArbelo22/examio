import type { DefaultSession } from "next-auth";
import type { SessionAuthError, UserRole } from "@/types/auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    identificadorInstitucional?: number;
    idAlumno?: number;
    idDocente?: number;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
    refreshTokenExpiresAt: number;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      identificadorInstitucional?: number;
      idAlumno?: number;
      idDocente?: number;
    } & DefaultSession["user"];
    authError?: SessionAuthError;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    identificadorInstitucional?: number;
    idAlumno?: number;
    idDocente?: number;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
    refreshTokenExpiresAt: number;
    authError?: SessionAuthError;
  }
}
