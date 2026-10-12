"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useSession } from "next-auth/react";
import { useGetEvaluacionesDocente } from "@/hooks/useEvaluaciones";
import type { EvaluacionDocente, EstadoActividad } from "@/types/index";

interface BadgeConfig {
  label: string;
  className: string;
}

function getStatusBadge(
  fechaInicio: string,
  fechaFin: string,
  estado: EstadoActividad
): BadgeConfig {
  if (estado === "archivada") {
    return { label: "Archivado", className: "bg-slate-100 text-slate-500 border border-slate-200" };
  }
  if (estado === "borrador") {
    return { label: "Borrador", className: "bg-amber-50 text-amber-700 border border-amber-200" };
  }
  const now = new Date();
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  if (now < inicio) {
    return { label: "Programado", className: "bg-amber-50 text-amber-700 border border-amber-200" };
  }
  if (now >= inicio && now <= fin) {
    return { label: "Activo", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  }
  return { label: "Finalizado", className: "bg-slate-100 text-slate-500 border border-slate-200" };
}

export default function ProfesorPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const legajo = session?.user?.identificadorInstitucional
    ? Number(session.user.identificadorInstitucional)
    : 0;

  const { data: evaluaciones = [], isLoading } = useGetEvaluacionesDocente(legajo);

  return (
    <div className="grid grid-cols-1 gap-8 antialiased">

      {/* SECCIÓN SUPERIOR: Barra de Acciones Rápidas */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Centro de Gestión Docente</h2>
          <p className="text-xs text-slate-400 mt-0.5">Diseñá entornos seguros y monitoreá rendimientos.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
          <Button
            onClick={() => router.push("/profesor/crear-examen")}
            className="flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.99]"
          >
            Crear actividad
          </Button>
          <Link href="/profesor/banco-preguntas">
            <Button className="w-full rounded-xl border border-indigo-200 bg-white px-5 py-3 text-xs font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50 sm:w-auto">
              Banco de preguntas
            </Button>
          </Link>
          <Link href="/profesor/reportes">
            <Button className="w-full rounded-xl border border-indigo-200 bg-white px-5 py-3 text-xs font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50 sm:w-auto">
              Reportes
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Mis Evaluaciones</h2>
        <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full">
          {isLoading ? "..." : `${evaluaciones.length} evaluaciones`}
        </span>
      </div>

      {isLoading && (
        <p className="text-sm font-medium text-slate-400 italic">
          Cargando evaluaciones asignadas...
        </p>
      )}

      {!isLoading && evaluaciones.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400">
          No tenés evaluaciones publicadas en tus comisiones.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {evaluaciones.map((exam: EvaluacionDocente) => {
          const badge = getStatusBadge(exam.fechaInicio, exam.fechaFin, exam.estado);
          return (
            <div
              key={exam.idPublicacion}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.03)] transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    {exam.duracionMinutos ? `${exam.duracionMinutos} min` : "Sin límite"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-1">{exam.titulo}</h3>
                <p className="text-xs text-slate-500 font-medium mb-3">
                  {exam.materia} &middot; {exam.carrera}
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                  <div className="flex-1 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Asignados</p>
                    <p className="text-lg font-black text-slate-800">{exam.alumnosInscriptos}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="flex-1 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Rendidos</p>
                    <p className="text-lg font-black text-slate-800">{exam.totalIntentos}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-medium">
                  {exam.cantidadIntentosMaximos} intento{exam.cantidadIntentosMaximos !== 1 ? "s" : ""} m&aacute;ximo
                </p>
              </div>

              <div className="mt-4 pt-2">
                <Link
                  href={
                    exam.estado === "borrador"
                      ? `/profesor/examen/${exam.idPublicacion}/editar`
                      : `/profesor/examen/${exam.idPublicacion}`
                  }
                  className="block w-full"
                >
                  <Button className="w-full py-2 px-4 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
                    {exam.estado === "borrador"
                      ? "Continuar borrador"
                      : "Gestionar evaluación"}
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
