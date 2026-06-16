import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "alumno" | "docente" | "admin";
    identificadorInstitucional?: number;
    idAlumno?: number;
    accessToken?: string; // <-- JWT de api_node para Authorization header
  }

  interface Session {
    user: {
      id: string;
      role: "alumno" | "docente" | "admin";
      identificadorInstitucional?: number;
      idAlumno?: number;
      accessToken?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "alumno" | "docente" | "admin";
    identificadorInstitucional?: number;
    idAlumno?: number;
    accessToken?: string;
  }
}