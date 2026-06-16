import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";

// para manejar la autenticacion y sus peticiones GET y POST en la app
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };