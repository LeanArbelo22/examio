"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useGetDetalleEvaluacion, useGetAlumnosInscriptos } from "@/hooks/useEvaluaciones";
import type { AlumnoIntento } from "@/types/index";
import { StudentAttemptsModal } from "@/components/evaluaciones/StudentAttemptsModal";
import { ReviewPolicyPanel } from "@/components/evaluaciones/ReviewPolicyPanel";

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
  const { data: alumnosData = [], isLoading: loadingAlumnos } = useGetAlumnosInscriptos(idPub);
  const alumnos = alumnosData as AlumnoIntento[];
  const [selectedStudent, setSelectedStudent] = useState<AlumnoIntento | null>(null);

  const alumnosUnicos = useMemo(() => {
    const byStudent = new Map<number, AlumnoIntento[]>();
    for (const alumno of alumnos) {
      const attempts = byStudent.get(alumno.matricula) ?? [];
      attempts.push(alumno);
      byStudent.set(alumno.matricula, attempts);
    }

    return [...byStudent.values()].map((attempts) => {
      const latest = [...attempts].sort(
        (a, b) => (b.numeroIntento ?? 0) - (a.numeroIntento ?? 0),
      )[0];
      return { alumno: latest, totalIntentos: attempts.filter((item) => item.idIntento).length };
    });
  }, [alumnos]);

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

      <ReviewPolicyPanel idPublicacion={idPub} />

      {/* ---- TABLA DE ALUMNOS ---- */}
      <div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight mb-3">
          Alumnos inscriptos ({alumnosUnicos.length})
        </h3>

        {alumnosUnicos.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400">
            No hay alumnos inscriptos para esta evaluaci&oacute;n.
          </div>
        )}

        {alumnosUnicos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4">Matr&iacute;cula</th>
                  <th className="pb-3 pr-4">Alumno</th>
                  <th className="pb-3 pr-4">Correo</th>
                  <th className="pb-3 pr-4">Último estado</th>
                  <th className="pb-3 pr-4">Última nota</th>
                  <th className="pb-3 pr-4">Intentos</th>
                  <th className="pb-3 text-right">Acci&oacute;n</th>
                </tr>
              </thead>
              <tbody>
                {alumnosUnicos.map(({ alumno, totalIntentos }) => (
                  <tr key={alumno.matricula} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
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
                        const nota = alumno.notaFinal;
                        return nota !== null ? (
                          <span className="font-black text-sm text-slate-700">
                            {nota.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">&mdash;</span>
                        );
                      })()}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500">
                      {totalIntentos}/{alumno.cantidadIntentosMaximos}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        type="button"
                        onClick={() => setSelectedStudent(alumno)}
                        className="w-full max-w-[150px] rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                      >
                        Gestionar intentos
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentAttemptsModal
        idPublicacion={idPub}
        alumno={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
}
