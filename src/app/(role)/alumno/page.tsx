"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useSession } from "next-auth/react";
import {
  useGetExamenesPendientes,
  useGetEstadisticasAlumno,
  useGetIntentosDetallados,
  useGetHistorialCorregido,
} from "@/hooks/useEvaluaciones";
import type { HistorialCorregidoItem } from "@/types/index";

export default function AlumnoPage() {
  const { data: session } = useSession();

  const identificador = session?.user?.identificadorInstitucional
    ? Number(session.user.identificadorInstitucional)
    : 0;

  const { data: pendingActivities = [], isLoading } = useGetExamenesPendientes(identificador);
  const { data: stats } = useGetEstadisticasAlumno(identificador);
  const { data: intentosRealizados = [] } = useGetIntentosDetallados(identificador);
  const { data: historial = [] } = useGetHistorialCorregido(identificador);

  const activas = pendingActivities.filter((evaluacion) => !evaluacion.intentosAgotados);
  const entregados = intentosRealizados.filter((intento) => intento.estado !== "en_progreso");

  const ultimosResultados = historial.slice(0, 3);

  const promedio = stats?.promedioGeneral != null ? Number(stats.promedioGeneral).toFixed(1) : "0.0";
  const porcentaje = stats?.porcentajeAprobacion != null ? `${Math.round(stats.porcentajeAprobacion)}%` : "0%";
  const anchoBarra = stats?.promedioGeneral != null ? Math.min(Number(stats.promedioGeneral) * 10, 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 antialiased">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Actividades pendientes</h2>
          <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full">
            {isLoading ? "..." : `${activas.length} por rendir`}
          </span>
        </div>

        {isLoading && (
          <p className="text-sm font-medium text-slate-400 italic">
            Consultando inscripciones y exámenes asignados en base de datos...
          </p>
        )}

        {!isLoading && pendingActivities.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400">
            No tenés evaluaciones publicadas pendientes de realización en tus comisiones.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activas.map((exam) => {
            const {
              idPublicacion,
              materia,
              duracionMinutos,
              fechaFin,
            } = exam;

            return (
              <div
                key={idPublicacion}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.03)] transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-600 border border-indigo-100">
                      Disponible
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {duracionMinutos ? `${duracionMinutos} min` : "Sin límite"}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-1">{materia}</h3>

                  <div className="mt-4 flex items-center gap-3 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="flex items-center gap-1">
                      ⏱️ {fechaFin ? new Date(fechaFin).toLocaleDateString("es-AR") : "---"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-2">
                  {(() => {
                    if (exam.enProgreso) {
                      return (
                        <Link href={`/alumno/examen/${idPublicacion}`} className="block w-full">
                          <Button className="w-full py-2 px-4 text-xs font-semibold rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-sm">
                            Continuar Examen
                          </Button>
                        </Link>
                      );
                    }

                    if (exam.intentosRealizados > 0 && exam.puedeReintentar) {
                      return (
                        <Link href={`/alumno/examen/${idPublicacion}`} className="block w-full">
                          <Button className="w-full py-2 px-4 text-xs font-semibold rounded-xl bg-sky-500 text-white hover:bg-sky-600 shadow-sm">
                            Reintentar Examen
                          </Button>
                        </Link>
                      );
                    }

                    return (
                      <Link href={`/alumno/examen/${idPublicacion}`} className="block w-full">
                        <Button className="w-full py-2 px-4 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
                          Iniciar Examen
                        </Button>
                      </Link>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {entregados.length > 0 ? (
          <div className="mt-8">
            <h3 className="text-base font-bold text-slate-500 tracking-tight mb-3">Exámenes entregados</h3>
            <div className="space-y-2">
              {entregados.map((exam) => (
                <div
                  key={exam.idIntento}
                  className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-200 text-slate-600 shrink-0">
                      Entregado
                    </span>
                    <p className="text-sm font-semibold text-slate-700 truncate">{exam.materia}</p>
                    <span className="text-xs text-slate-400 truncate hidden sm:inline">&middot; {exam.tituloEvaluacion}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {exam.notaFinal != null && (
                      <span className={`text-sm font-black ${exam.notaFinal >= 6 ? "text-emerald-600" : "text-red-500"}`}>
                        {exam.notaFinal.toFixed(1)}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {exam.fechaFin ? new Date(exam.fechaFin).toLocaleDateString("es-AR") : "---"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !isLoading ? (
          <div className="mt-8 bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-medium text-slate-400">
            No tenés exámenes registrados en esta sección.
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-4">Tu rendimiento</h2>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] grid grid-cols-2 gap-4">
            <div className="border-r border-slate-100 pr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Promedio</p>
              <p className="text-3xl font-black text-slate-800 tracking-tight mt-1">
                {promedio}
              </p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full"
                  style={{ width: `${anchoBarra}%` }}
                />
              </div>
            </div>
            <div className="pl-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aprobadas</p>
              <p className="text-3xl font-black text-emerald-600 tracking-tight mt-1">
                {porcentaje}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-2">
                {stats != null
                  ? `${stats.aprobados ?? 0} de ${stats.totalCorregidos ?? 0} corregidos`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Últimos resultados</h2>
            <Link href="/alumno/resultados" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Ver todo</Link>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-3">
            {ultimosResultados.length === 0 && (
              <p className="text-xs text-slate-400 font-medium text-center py-2">
                Aún no hay exámenes corregidos.
              </p>
            )}
            {ultimosResultados.map((result: HistorialCorregidoItem) => {
              const nota = result.notaFinal != null ? result.notaFinal : 0;
              return (
                <div key={result.idIntento} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100">
                  <div className="max-w-[75%]">
                    <p className="text-sm font-bold text-slate-700 truncate">{result.tituloEvaluacion}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{result.materia}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-sm font-black rounded-lg ${nota >= 6 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                    {nota.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
