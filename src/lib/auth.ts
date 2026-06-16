import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const API_NODE_URL = "http://localhost:55803/api";

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

        try {
          const response = await fetch(`${API_NODE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              Email: credentials.email.trim(),
              Password: credentials.password,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const body: { success: boolean; data?: { token: string; user: { id: number; email: string; name: string; role: "alumno" | "docente" | "admin"; identificadorInstitucional?: number; idAlumno?: number } } } = await response.json();

          if (!body.success || !body.data?.user) {
            return null;
          }

          const { token, user } = body.data;

          const mappedUser: User = {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            identificadorInstitucional: user.identificadorInstitucional,
            idAlumno: user.idAlumno,
            accessToken: token,
          };

          return mappedUser;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.identificadorInstitucional = user.identificadorInstitucional;
        token.idAlumno = (user as any).idAlumno; // Forzar lectura del login
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.identificadorInstitucional = token.identificadorInstitucional as number;
        session.user.idAlumno = token.idAlumno as number; // Inyección crítica
        session.user.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 3,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
