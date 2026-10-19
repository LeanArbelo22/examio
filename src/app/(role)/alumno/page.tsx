"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  useGetEstadisticasAlumno,
  useGetExamenesPendientes,
  useGetHistorialCorregido,
} from "@/hooks/useEvaluaciones";
import type { HistorialCorregidoItem } from "@/types/index";

function formatDeadline(value: string | null): string {
  if (!value) return "Sin fecha límite";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AlumnoPage() {
  const { data: session } = useSession();
  const identificador = session?.user?.identificadorInstitucional
    ? Number(session.user.identificadorInstitucional)
    : 0;

  const { data: pendingActivities = [], isLoading } = useGetExamenesPendientes(identificador);
  const { data: stats } = useGetEstadisticasAlumno(identificador);
  const { data: historial = [] } = useGetHistorialCorregido(identificador);

  const activas = pendingActivities.filter((evaluacion) => !evaluacion.intentosAgotados);
  const ultimosResultados = historial.slice(0, 3);
  const promedio = stats?.promedioGeneral != null
    ? Number(stats.promedioGeneral).toFixed(1)
    : "—";
  const porcentaje = stats?.porcentajeAprobacion != null
    ? `${Math.round(stats.porcentajeAprobacion)}%`
    : "—";
  const anchoBarra = stats?.promedioGeneral != null
    ? Math.min(Number(stats.promedioGeneral) * 10, 100)
    : 0;

  return (
    <div className="grid grid-cols-1 gap-8 antialiased lg:grid-cols-3">
      <section className="space-y-5 lg:col-span-2" aria-labelledby="pending-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="pending-title" className="text-xl font-bold tracking-tight text-slate-900">
              Próximas actividades
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Iniciá, continuá o reintentá las evaluaciones que todavía tenés disponibles.
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            {isLoading ? "Consultando..." : `${activas.length} ${activas.length === 1 ? "pendiente" : "pendientes"}`}
          </span>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500">
            Consultando tus actividades disponibles...
          </div>
        )}

        {!isLoading && activas.length === 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
            <p className="text-lg font-black text-slate-900">Estás al día</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              No tenés actividades disponibles para rendir en este momento.
            </p>
            <Link
              href="/alumno/resultados"
              className="mt-5 inline-flex rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-sm hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Consultar mi historial
            </Link>
          </div>
        )}

        {!isLoading && activas.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {activas.map((exam) => {
              const action = exam.enProgreso
                ? { label: "Continuar examen", className: "bg-amber-500 hover:bg-amber-600" }
                : exam.intentosRealizados > 0 && exam.puedeReintentar
                  ? { label: "Reintentar examen", className: "bg-sky-600 hover:bg-sky-700" }
                  : { label: "Iniciar examen", className: "bg-indigo-600 hover:bg-indigo-700" };

              return (
                <article
                  key={exam.idPublicacion}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-shadow hover:shadow-[0_12px_24px_rgba(0,0,0,0.04)]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                        {exam.enProgreso ? "En progreso" : "Disponible"}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {exam.duracionMinutos ? `${exam.duracionMinutos} min` : "Sin límite"}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-black tracking-tight text-slate-900">
                      {exam.titulo}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-600">{exam.materia}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                      <div>
                        <dt className="font-semibold text-slate-500">Disponible hasta</dt>
                        <dd className="mt-1 font-bold text-slate-800">{formatDeadline(exam.fechaFin)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Intentos utilizados</dt>
                        <dd className="mt-1 font-bold text-slate-800">
                          {exam.intentosRealizados} de {exam.cantidadIntentosMaximos}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <Link
                    href={`/alumno/examen/${exam.idPublicacion}`}
                    className={`mt-5 block w-full rounded-xl px-4 py-2.5 text-center text-xs font-bold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${action.className}`}
                  >
                    {action.label}
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <aside className="space-y-6" aria-label="Resumen académico">
        <section aria-labelledby="performance-title">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="performance-title" className="text-xl font-bold tracking-tight text-slate-900">
              Resumen académico
            </h2>
            <Link
              href="/alumno/resultados"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Ver historial
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div className="border-r border-slate-100 pr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Promedio</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-slate-800">{promedio}</p>
              <div
                className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label="Promedio general"
                aria-valuemin={0}
                aria-valuemax={10}
                aria-valuenow={stats?.promedioGeneral ?? 0}
              >
                <div className="h-full rounded-full bg-indigo-600" style={{ width: `${anchoBarra}%` }} />
              </div>
            </div>
            <div className="pl-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Aprobadas</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-emerald-600">{porcentaje}</p>
              <p className="mt-2 text-[11px] font-medium text-slate-500">
                {stats != null
                  ? `${stats.aprobados ?? 0} de ${stats.totalCorregidos ?? 0} resultados`
                  : "Sin resultados académicos"}
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="recent-title">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="recent-title" className="text-xl font-bold tracking-tight text-slate-900">
              Resultados recientes
            </h2>
            <Link
              href="/alumno/resultados"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            {ultimosResultados.length === 0 && (
              <div className="py-3 text-center">
                <p className="text-sm font-bold text-slate-700">Todavía no hay resultados</p>
                <p className="mt-1 text-xs text-slate-500">
                  Acá aparecerán únicamente tus resultados académicos corregidos.
                </p>
              </div>
            )}
            {ultimosResultados.map((result: HistorialCorregidoItem) => {
              return (
                <div
                  key={result.idIntento}
                  className="flex items-center justify-between rounded-xl border border-transparent p-2 transition-colors hover:border-slate-100 hover:bg-slate-50/80"
                >
                  <div className="max-w-[75%]">
                    <p className="truncate text-sm font-bold text-slate-700">{result.tituloEvaluacion}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">{result.materia}</p>
                  </div>
                  <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-sm font-black text-indigo-700">
                    {result.notaFinal == null ? "—" : result.notaFinal.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </aside>
    </div>
  );
}
