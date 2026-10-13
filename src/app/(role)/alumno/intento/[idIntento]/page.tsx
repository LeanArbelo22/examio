"use client";

import { use } from "react";
import Link from "next/link";
import { useGetIntentoCompleto } from "@/hooks/useEvaluaciones";
import type { PreguntaIntento, OpcionIntento } from "@/types/index";
import { formatGrade } from "@/lib/attempt-grading";

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  mc: { label: "Selección única", className: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  multiple: { label: "Selección múltiple", className: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  vf: { label: "V/F", className: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  abierta: { label: "Abierta", className: "bg-purple-50 text-purple-700 border border-purple-200" },
  code: { label: "Code", className: "bg-purple-50 text-purple-700 border border-purple-200" },
};

function BadgeTipo({ tipo }: { tipo: string }) {
  const cfg = TIPO_BADGE[tipo];
  if (!cfg) return null;
  return (
    <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export default function RevisionAlumnoPage({ params }: { params: Promise<{ idIntento: string }> }) {
  const { idIntento } = use(params);
  const idInt = Number(idIntento);

  const { data, isLoading } = useGetIntentoCompleto(idInt);

  if (isLoading) {
    return (
      <p className="text-sm font-medium text-slate-400 italic">
        Cargando revisión del examen...
      </p>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400">
        No se encontró el intento.
      </div>
    );
  }

  const tieneNotaFinal = data.notaFinal !== null;
  const nota = tieneNotaFinal ? data.notaFinal : data.notaAutomatica;
  const notaAprobacion = data.notaAprobacion;

  function notaColor(): string {
    if (!tieneNotaFinal) return "text-slate-700";
    return nota !== null && nota >= notaAprobacion ? "text-emerald-600" : "text-red-500";
  }

  return (
    <div className="grid grid-cols-1 gap-6 antialiased">
      {/* Cabecera del examen */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {data.tituloEvaluacion}
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {data.tipoEvaluacion}
            </p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nota</p>
              <p className={`text-2xl font-black ${nota !== null ? notaColor() : "text-slate-300"}`}>
                {formatGrade(nota, data.escalaCalificacion)}
              </p>
            </div>
            <Link
              href="/alumno"
              className="bg-indigo-600 text-white text-xs font-bold py-2.5 px-5 rounded-xl hover:bg-indigo-700 shadow-sm transition-all shrink-0"
            >
              Volver al Dashboard
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Intento</p>
            <p className="font-bold text-slate-800 mt-1">#{data.numeroIntento}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Duración</p>
            <p className="font-bold text-slate-800 mt-1">
              {data.fechaFin
                ? `${Math.round((new Date(data.fechaFin).getTime() - new Date(data.fechaInicio).getTime()) / 60000)} min`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Inicio</p>
            <p className="font-bold text-slate-800 mt-1">{new Date(data.fechaInicio).toLocaleString("es-AR")}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Fin</p>
            <p className="font-bold text-slate-800 mt-1">
              {data.fechaFin ? new Date(data.fechaFin).toLocaleString("es-AR") : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Preguntas */}
      <div className="space-y-4">
        {data.preguntas.map((p: PreguntaIntento) => (
          <div key={p.idPregunta} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                {p.grupoConceptualmente && (
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {p.grupoConceptualmente}
                  </p>
                )}
                <p className="text-sm font-semibold text-slate-800">{p.enunciado}</p>
              </div>
              <BadgeTipo tipo={p.tipo} />
            </div>

            {p.tipo !== "abierta" && p.tipo !== "code" && p.opciones?.length > 0 && (
              <div className="space-y-1.5">
                {p.opciones.map((op: OpcionIntento) => {
                  const isCorrect = op.esCorrecta;
                  const isSelected = op.fueSeleccionada === 1 || op.fueSeleccionada === true;
                  const correctionAvailable = typeof isCorrect === "boolean";

                  let bg = "bg-slate-50 border-slate-100 text-slate-500";
                  let icon = "○";
                  let badge: { label: string; className: string } | null = null;

                  if (!correctionAvailable && isSelected) {
                    bg = "bg-indigo-50 border-indigo-200 text-indigo-800";
                    icon = "●";
                    badge = { label: "Tu elección", className: "bg-indigo-100 text-indigo-700" };
                  } else if (isCorrect && isSelected) {
                    bg = "bg-emerald-50 border-emerald-300 text-emerald-800";
                    icon = "✓";
                    badge = { label: "Correcta", className: "bg-emerald-100 text-emerald-700" };
                  } else if (!isCorrect && isSelected) {
                    bg = "bg-red-50 border-red-300 text-red-800";
                    icon = "✗";
                    badge = { label: "Su Elección (Incorrecta)", className: "bg-red-100 text-red-700" };
                  } else if (isCorrect && !isSelected) {
                    bg = "bg-emerald-50/40 border-emerald-200 text-emerald-700 italic";
                    icon = "○";
                    badge = { label: "Era la Correcta", className: "bg-emerald-100/60 text-emerald-600" };
                  }

                  return (
                    <div
                      key={op.idOpcion}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${bg}`}
                    >
                      <span className="font-mono text-xs w-4 text-center shrink-0">{icon}</span>
                      <span className="flex-1">{op.texto}</span>
                      {badge && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                  );
                })}
                {p.opciones.every((option) => typeof option.esCorrecta !== "boolean") && (
                  <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {p.puntajeObtenido === null
                      ? "La corrección detallada de esta pregunta todavía no está disponible."
                      : `Pregunta corregida: ${formatGrade(p.puntajeObtenido)} de ${formatGrade(p.puntajeMaximo)} puntos. Las respuestas correctas todavía no están disponibles para revisión.`}
                  </p>
                )}
              </div>
            )}

            {(p.tipo === "abierta" || p.tipo === "code") && (
              <div className={`mt-4 rounded-2xl border p-4 ${
                p.puntajeObtenido === null
                  ? "border-amber-200 bg-amber-50/30"
                  : "border-indigo-200 bg-indigo-50/20"
              }`}>
                {p.puntajeObtenido === null ? (
                  <span className="mb-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    ⏳ Pendiente de corrección manual
                  </span>
                ) : (
                  <span className="mb-2 inline-block rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    Corregida · {formatGrade(p.puntajeObtenido)} de {formatGrade(p.puntajeMaximo)} puntos
                  </span>
                )}
                
                <div className="text-sm text-slate-700 whitespace-pre-wrap">
                  {p.respuesta?.rtaTexto || (
                    <span className="italic text-slate-400">Sin respuesta</span>
                  )}
                </div>

                {/* Comentarios del docente */}
                {(p.comentariosDocente ?? p.respuesta?.comentariosDocente) && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-150 text-sm text-slate-600 italic shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                        <p className="font-bold mb-1">💬 Devolución del docente:</p>
                        <p className="whitespace-pre-wrap">{p.comentariosDocente ?? p.respuesta?.comentariosDocente}</p>
                    </div>
                )}
              </div>
            )}

            {(p.modoJustificacion ?? "sin_justificacion") !== "sin_justificacion" && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Tu justificación
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {p.respuesta?.justificacion || (
                    <span className="italic text-slate-500">Sin justificación.</span>
                  )}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
