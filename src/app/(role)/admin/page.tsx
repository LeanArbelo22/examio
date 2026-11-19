import Link from "next/link";
import { DashboardCard } from "@/components/ui/DashboardCard";

const managementGroups = [
  {
    title: "Estructura académica",
    items: [
      { title: "Carreras", description: "Alta, planes de estudio y alumnos.", href: "/admin/carreras" },
      { title: "Materias", description: "Alta de materias, asignación de comisiones y configuraciones base.", href: "/admin/materias" },
      { title: "Comisiones", description: "Apertura de divisiones por año, turnos y comisiones activas.", href: "/admin/comisiones" },
    ],
  },
  {
    title: "Personas y accesos",
    items: [
      { title: "Cuerpo Docente", description: "Alta y modificación de legajos docentes.", href: "/admin/docentes" },
      { title: "Alumnos", description: "Matriculación, cursado y control.", href: "/admin/alumnos" },
      { title: "Usuarios", description: "Credenciales de acceso, roles y control de sesiones activas.", href: "/admin/usuarios" },
    ],
  },
];

export default function InstitucionPage() {
  return (
    <div className="space-y-6 antialiased">
      <section aria-labelledby="analytics-entry-title" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="analytics-entry-title" className="text-xl font-bold tracking-tight text-slate-900">Rendimiento Institucional</h2>
          <p className="text-sm text-slate-600">Institución Cervantes</p>
        </div>
        <div className="mt-3 flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-2xl text-base leading-relaxed text-slate-600">
            KPIs globales, análisis de intentos y evaluaciones por carrera, materia y comisión.
          </p>
          <div className="flex w-full flex-wrap gap-3 lg:w-auto lg:shrink-0">
          <Link href="/admin/analitica" className="inline-flex min-h-11 max-w-full items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
            Ver rendimiento institucional
          </Link>
          <Link href="/admin/reportes" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">Reportes</Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="management-title" className="space-y-5">
        <h2 id="management-title" className="text-xl font-bold tracking-tight text-slate-900">Gestión Global</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {managementGroups.map((group) => (
            <section key={group.title} aria-label={group.title} className="min-w-0 space-y-3">
              <h3 className="text-base font-semibold text-slate-700">{group.title}</h3>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {group.items.map((item) => (
                  <li key={item.href} className="first:[&>a]:rounded-t-2xl last:[&>a]:rounded-b-2xl">
                    <DashboardCard {...item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
