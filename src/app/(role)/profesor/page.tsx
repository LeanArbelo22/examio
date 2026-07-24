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
        <Button
          onClick={() => router.push("/profesor/crear-examen")}
          className="bg-indigo-600 text-white text-xs font-bold py-3 px-5 rounded-xl hover:bg-indigo-700 active:scale-[0.99] transition-all shadow-sm shrink-0 flex items-center justify-center gap-2"
        >
          <span>🆕</span> Crear Nuevo Examen
        </Button>
        <Link href="/profesor/reportes">
          <Button className="w-full bg-white text-indigo-700 text-xs font-bold py-3 px-5 rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm sm:w-auto">
            Reportes
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Mis Evaluaciones</h2>
        <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full">
          {isLoading ? "..." : `${evaluaciones.length} publicadas`}
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
                <Link href={`/profesor/examen/${exam.idPublicacion}`} className="block w-full">
                  <Button className="w-full py-2 px-4 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
                    Gestionar Evaluación
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
