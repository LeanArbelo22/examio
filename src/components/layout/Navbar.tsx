"use client";

import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/images/logo.svg";
import { Button } from "../ui/Button";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Si está en el entorno del examen, la barra no existe visual ni estructuralmente
  if (pathname.startsWith("/alumno/")) {
    return null;
  }

  const renderAuthButtons = () => {
    if (pathname === "/login") return null;

    if (status === "authenticated") {
      return (
        <div className="flex items-center gap-5">
          <span className="hidden sm:inline text-sm font-medium text-slate-600">
            {session?.user?.name || session?.user?.email}
          </span>
          <Button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="bg-slate-300/80 border border-slate-200/60 text-slate-700 px-4 py-2 text-sm font-medium rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
          >
            Cerrar sesión
          </Button>
        </div>
      );
    }

    if (status === "loading") return null;

    return (
      <Link href="/login" className="inline-block">
        <Button className="bg-indigo-600 px-5 py-2 text-sm text-white font-medium hover:bg-indigo-700 shadow-sm transition-all duration-200 rounded-lg">
          Ingresar
        </Button>
      </Link>
    );
  };

  return (
    <nav className="sticky top-4 z-40 mx-auto w-[calc(100%-2rem)] max-w-7xl border border-slate-200/80 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm transition-all">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="transition-opacity hover:opacity-90">
            <Image
              src={logo}
              alt="logo examio"
              width={140}
              height={24}
              priority
            />
          </Link>
          <div className="flex items-center">{renderAuthButtons()}</div>
        </div>
      </div>
    </nav>
  );
}