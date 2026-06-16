"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useGetDetalleEvaluacion, useGetAlumnosInscriptos } from "@/hooks/useEvaluaciones";
import type { AlumnoIntento } from "@/types/index";

const ESTADO_BADGE: Record<string, { label: string; className: string } | undefined> = {
  "en_progreso": { label: "En progreso", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  "entregado":   { label: "Entregado",   className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
};

function EstadoBadge({ estado }: { estado: string | null }) {
  if (!estado) {
    return (
      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase bg-slate-100 text-slate-500 border border-slate-200">
        Pendiente
      </span>
    );
  }
  const cfg = ESTADO_BADGE[estado];
  if (cfg) {
    return (
      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase ${cfg.className}`}>
        {cfg.label}
      </span>
    );
  }
  return <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase bg-slate-100 text-slate-500 border border-slate-200">{estado}</span>;
}

export default function GestionExamenPage({ params }: { params: Promise<{ idPublicacion: string }> }) {
  const { idPublicacion } = use(params);
  const idPub = Number(idPublicacion);

  const { data: detalle, isLoading: loadingDetalle } = useGetDetalleEvaluacion(idPub);
  const { data: alumnos = [], isLoading: loadingAlumnos } = useGetAlumnosInscriptos(idPub);

  const isLoading = loadingDetalle || loadingAlumnos;

  if (isLoading) {
    return (
      <p className="text-sm font-medium text-slate-400 italic">
        Cargando detalle de la evaluaci&oacute;n y alumnos inscriptos...
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 antialiased">
      {/* ---- HEADER + BOTÓN PLANTILLA ---- */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{detalle?.titulo ?? "Evaluación"}</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {detalle?.materia ?? "—"} &middot; {detalle?.division ?? "—"}
          </p>
        </div>
        <Link href={`/profesor/examen/${idPub}/detalle`}>
          <Button className="py-2 px-4 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
            Ver Plantilla de Preguntas
          </Button>
        </Link>
      </div>

      {/* ---- INFO CARD ---- */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Duraci&oacute;n</p>
          <p className="text-lg font-black text-slate-800 mt-1">{detalle?.duracionMinutos ?? "—"} min</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Intentos m&aacute;x</p>
          <p className="text-lg font-black text-slate-800 mt-1">{detalle?.cantidadIntentosMaximos ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Inicio</p>
          <p className="text-sm font-bold text-slate-800 mt-1">
            {detalle?.fechaInicio ? new Date(detalle.fechaInicio).toLocaleString("es-AR") : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Fin</p>
          <p className="text-sm font-bold text-slate-800 mt-1">
            {detalle?.fechaFin ? new Date(detalle.fechaFin).toLocaleString("es-AR") : "—"}
          </p>
        </div>
      </div>

      {/* ---- TABLA DE ALUMNOS ---- */}
      <div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight mb-3">
          Alumnos inscriptos ({alumnos.length})
        </h3>

        {alumnos.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400">
            No hay alumnos inscriptos para esta evaluaci&oacute;n.
          </div>
        )}

        {alumnos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4">Matr&iacute;cula</th>
                  <th className="pb-3 pr-4">Alumno</th>
                  <th className="pb-3 pr-4">Correo</th>
                  <th className="pb-3 pr-4">Estado</th>
                  <th className="pb-3 pr-4">Nota</th>
                  <th className="pb-3 pr-4">Intento</th>
                  <th className="pb-3 text-right">Acci&oacute;n</th>
                </tr>
              </thead>
              <tbody>
                {alumnos.map((alumno: AlumnoIntento, idx: number) => (
                  <tr key={`${alumno.matricula}_${alumno.idIntento ?? idx}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-500">{alumno.matricula}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-800 whitespace-nowrap">
                      {alumno.apellido}, {alumno.nombre}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500">{alumno.correo}</td>
                    <td className="py-3 pr-4">
                      <EstadoBadge estado={alumno.estadoIntento} />
                    </td>
                    <td className="py-3 pr-4">
                      {(() => {
                        const nota = alumno.notaFinal ?? alumno.notaAutomatica;
                        return nota !== null ? (
                          <span className={`font-black text-sm ${nota >= 6 ? "text-emerald-600" : "text-red-500"}`}>
                            {nota.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">&mdash;</span>
                        );
                      })()}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500">
                      {alumno.numeroIntento ?? "—"}/{alumno.cantidadIntentosMaximos}
                    </td>
                    <td className="py-3 text-right">
                      {!alumno.idIntento ? (
                        <Button disabled className="w-full py-2 px-4 text-xs font-semibold rounded-xl bg-gray-300 text-gray-500">
                          Ver Examen
                        </Button>
                      ) : (
                        <Link href={`/profesor/intento/${alumno.idIntento}`} className="inline-block w-full max-w-[140px]">
                          <Button className="w-full py-2 px-4 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
                            Ver Examen
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
