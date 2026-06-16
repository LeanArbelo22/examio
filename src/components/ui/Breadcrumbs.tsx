"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routeLabels: Record<string, string> = {
  alumno: "Panel Alumno",
  profesor: "Panel Profesor",
  admin: "Administración",
  examenes: "Mis Exámenes",
  resultados: "Resultados",
  configuracion: "Configuración",
  historial: "Historial",
};

export function Breadcrumbs() {
  const pathname = usePathname();

  // 1. BLOQUEO CRÍTICO: Si el alumno está rindiendo, el componente muere acá (retorna null) -- ANALIZAR
  if (pathname.includes("/alumno/examen")) {
    return null;
  }

  // Dividimos la ruta actual y filtramos los bloques vacíos
  const segments = pathname.split("/").filter(Boolean);

  // Si estamos en la raíz exacta del rol, tampoco se muestra
  if (segments.length <= 1) return null;

  return (
    <nav
      className="flex items-center space-x-2 text-sm font-medium text-slate-500 mb-6 antialiased"
      aria-label="Breadcrumb"
    >
      <Link
        href="/"
        className="transition-colors duration-200 hover:text-indigo-600"
      >
        Inicio
      </Link>

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const label =
          routeLabels[segment] ||
          segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <div key={href} className="flex items-center space-x-2">
            <span className="text-slate-300 select-none font-normal">/</span>

            {isLast ? (
              <span
                className="text-slate-800 font-semibold tracking-tight"
                aria-current="page"
              >
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="transition-colors duration-200 hover:text-indigo-600"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
