"use client";

import { DashboardCard } from "@/components/ui/DashboardCard";

export default function InstitucionPage() {
  const entidadesOperativas = [
    {
      title: "Carreras",
      description: "Alta, planes de estudio y alumnos.",
      icon: "📜",
      href: "/admin/carreras",
      accentColor: "bg-amber-50 text-amber-700 border-amber-100",
      badgeCount: "Gestionar",
    },
    {
      title: "Materias",
      description: "Alta de materias, asignación de comisiones y configuraciones base.",
      icon: "📚",
      href: "/admin/materias",
      accentColor: "bg-red-50 text-red-700 border-red-100",
      badgeCount: "Módulos",
    },
    {
      title: "Comisiones",
      description: "Apertura de divisiones por año, turnos y comisiones activas.",
      icon: "🗓️",
      href: "/admin/comisiones",
      accentColor: "bg-purple-50 text-purple-700 border-purple-100",
      badgeCount: "Gestionar",
    },
    {
      title: "Cuerpo Docente",
      description: "Alta y modificación de legajos docentes.",
      icon: "👨‍🏫",
      href: "/admin/docentes",
      accentColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
      badgeCount: "Gestionar",
    },
    {
      title: "Alumnos",
      description: "Matriculación, cursado y control.",
      icon: "🧑‍🎓",
      href: "/admin/alumnos",
      accentColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
      badgeCount: "Gestionar",
    },
    {
      title: "Usuarios",
      description: "Credenciales de acceso, roles y control de sesiones activas.",
      icon: "🔐",
      href: "/admin/usuarios",
      accentColor: "bg-cyan-50 text-cyan-700 border-cyan-100",
      badgeCount: "Accesos",
    },
  ];

  const herramientasAnaliticas = [
    {
      title: "Rendimiento Institucional",
      description: "KPIs globales, análisis de intentos y evaluaciones por carrera, materia y comisión.",
      icon: "📉",
      href: "/admin/analitica",
      accentColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
    },
  ];

  return (
    <div className="space-y-8 antialiased">
      
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Gestión Global
        </h2>
        
        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100/40 select-none">
          Institución Cervantes
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <div className="lg:col-span-3 space-y-8">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Estructura Académica y Legajos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {entidadesOperativas.map((option) => (
                <DashboardCard key={option.title} {...option} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Informes de Gestión y Auditoría
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {herramientasAnaliticas.map((option) => (
                <DashboardCard key={option.title} {...option} />
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
