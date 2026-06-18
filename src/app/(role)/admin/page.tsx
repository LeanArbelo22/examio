"use client";

import { DashboardCard } from "@/components/ui/DashboardCard";
import { institucionMockData } from "@/lib/db-mock";

export default function InstitucionPage() {
  const { globalKPIs, criticas } = institucionMockData;

  // Definición de opciones operativas (ABMs e Importaciones) con sus contadores reales de base de datos
  const entidadesOperativas = [
    {
      title: "Carreras",
      description: "Alta, planes de estudio y esquemas curriculares.",
      icon: "📜",
      href: "/admin/carreras",
      accentColor: "bg-amber-50 text-amber-700 border-amber-100",
      badgeCount: globalKPIs.carrerasCount,
    },
    {
      title: "Materias",
      description: "Asignación de cátedras, contenidos y configuraciones base.",
      icon: "📚",
      href: "/admin/materias", // Corregido el path absoluto
      accentColor: "bg-red-50 text-red-700 border-red-100",
      badgeCount: "Módulos",
    },
    {
      title: "Comisiones",
      description: "Apertura de divisiones por año, turnos y comisiones activas.",
      icon: "🗓️",
      href: "/admin/comisiones", // Corregido el path absoluto
      accentColor: "bg-purple-50 text-purple-700 border-purple-100",
      badgeCount: `${globalKPIs.comisionesCount} activas`,
    },
    {
      title: "Cuerpo Docente",
      description: "Auditoría de legajos, asignación a exámenes y reportes de corrección.",
      icon: "👨‍🏫",
      href: "/admin/docentes",
      accentColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
      badgeCount: globalKPIs.docentesCount,
    },
    {
      title: "Alumnos",
      description: "Matriculación masiva, historial de cursado y control de fraudes.",
      icon: "🧑‍🎓",
      href: "/admin/alumnos",
      accentColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
      badgeCount: globalKPIs.alumnosActivos,
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

  // Opciones analíticas transversales globales
  const herramientasAnaliticas = [
    {
      title: "Resultados y Actas",
      description: "Visualización, auditoría y firmas digitales de calificaciones finales.",
      icon: "📊",
      href: "/admin/resultados",
      accentColor: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      title: "Rendimiento Institucional",
      description: "KPIs globales, análisis de intentos y evaluaciones por carrera, materia y comisión.",
      icon: "📉",
      href: "/admin/analitica",
      accentColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
    },
    {
      title: "Métricas Avanzadas",
      description: "Análisis cruzado de rendimiento pedagógico de docentes y carreras.",
      icon: "📈",
      href: "/admin/reportes",
      accentColor: "bg-pink-50 text-pink-700 border-pink-100",
    },
    {
      title: "Parámetros del Sistema",
      description: "Roles globales, tokens de concurrencia y configuraciones institucionales.",
      icon: "⚙️",
      href: "/admin/configuracion",
      accentColor: "bg-slate-100 text-slate-700 border-slate-200",
    },
  ];

  return (
    <div className="space-y-8 antialiased">
      
      {/* SECCIÓN 1: Cabecera Ejecutiva e Identificación */}
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Métricas de Gestión Global
        </h2>
        
        {/* El identificador de la institución sube acá de forma minimalista */}
        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100/40 select-none">
          Institución Cervantes
        </span>
      </div>

      {/* SECCIÓN 2: Micro KPIs de Rendimiento General */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_4px_rgba(0,0,0,0.005)]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matrícula Total Viva</p>
          <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{globalKPIs.alumnosActivos} Alumnos</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_4px_rgba(0,0,0,0.005)]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promedio General Histórico</p>
          <p className="text-2xl font-black text-indigo-600 tracking-tight mt-1">{globalKPIs.promedioGeneralInstitucional.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_4px_rgba(0,0,0,0.005)] col-span-2 lg:col-span-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Efectividad Antifraude (Foco)</p>
          <p className="text-2xl font-black text-emerald-600 tracking-tight mt-1">99.8% Estable</p>
        </div>
      </div>

      {/* SECCIÓN 3: Grillas de Trabajo Asimétricas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Sub-bloque Izquierdo (3/4): Estructuras y Analíticas */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Grupo A: ABMs Estructurales */}
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

          {/* Grupo B: Herramientas Analíticas */}
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

        {/* Sub-bloque Derecho (1/4): Centro de Alertas Críticas de Calidad Docente/Alumno */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Anomalías en Cátedras
          </h2>
          
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-3">
            <p className="text-[11px] text-slate-400 font-medium leading-normal">
              Alertas automáticas de rendimiento atípico detectadas este ciclo:
            </p>

            {criticas.map((crit, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                <div className="flex justify-between items-center gap-2">
                  <p className="text-xs font-bold text-slate-800 truncate">{crit.catedra}</p>
                  <span className={`text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    crit.alertaType === "bajo_promedio" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-red-50 text-red-600 border border-red-100"
                  }`}>
                    {crit.alertaType === "bajo_promedio" ? "Bajo Rendimiento" : "Fraude Inusual"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Prof: {crit.profesor}</p>
                <p className="text-xs font-black text-slate-700 pt-1">{crit.valor}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}