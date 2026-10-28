"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Mantenemos tu lógica exacta de rutas permitidas
  const allowedPaths = ["/alumno", "/admin", "/profesor"];

  if (!allowedPaths.includes(pathname)) {
    return null;
  }
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 border-b border-slate-200/60 pb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Hola, <span className="text-slate-800">{session?.user?.name || "Usuario"}</span> 👋
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Te damos la bienvenida al panel de gestión de EXAMIO.
        </p>
      </div>
    </div>
  );
}