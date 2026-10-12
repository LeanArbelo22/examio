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
  reportes: "Reportes",
  "crear-examen": "Crear actividad",
  examen: "Evaluaciones",
  intento: "Intentos",
  detalle: "Detalle",
  actividad: "Actividad",
  "banco-preguntas": "Banco de preguntas",
  preguntas: "Preguntas",
  grupos: "Grupos",
  nueva: "Nueva",
  nuevo: "Nuevo",
  editar: "Editar",
};

const nonNavigablePaths = new Set([
  "/profesor/examen",
  "/profesor/intento",
  "/alumno/intento",
  "/profesor/banco-preguntas/preguntas",
  "/profesor/banco-preguntas/grupos",
]);

function getSegmentLabel(segment: string, previousSegment?: string): string {
  if (/^\d+$/.test(segment)) {
    if (previousSegment === "examen") return `Evaluación #${segment}`;
    if (previousSegment === "intento") return `Intento #${segment}`;
    if (previousSegment === "preguntas") return `Pregunta #${segment}`;
    if (previousSegment === "grupos") return `Grupo #${segment}`;
  }

  if (routeLabels[segment]) return routeLabels[segment];

  return decodeURIComponent(segment)
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isNavigablePath(href: string): boolean {
  if (nonNavigablePaths.has(href)) return false;
  return !/^\/profesor\/banco-preguntas\/(preguntas|grupos)\/\d+$/.test(href);
}

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
        const label = getSegmentLabel(segment, segments[index - 1]);
        const isLink = !isLast && isNavigablePath(href);

        return (
          <div key={href} className="flex items-center space-x-2">
            <span className="text-slate-300 select-none font-normal">/</span>

            {!isLink ? (
              <span
                className={isLast ? "text-slate-800 font-semibold tracking-tight" : "text-slate-500"}
                aria-current={isLast ? "page" : undefined}
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
