import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/", "/login"];
const protectedPaths = ["/alumno", "/profesor", "/admin"];

const roleToRoute: Record<string, string> = {
  alumno: "/alumno",
  docente: "/profesor",
  admin: "/admin",
};

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  if (!token) {
    if (protectedPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  const userRole = token.role as string;
  const userRoute = roleToRoute[userRole];

  if (!userRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL(userRoute, req.url));
  }

  if (protectedPaths.some((p) => pathname.startsWith(p)) && !pathname.startsWith(userRoute)) {
    return NextResponse.redirect(new URL(userRoute, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};