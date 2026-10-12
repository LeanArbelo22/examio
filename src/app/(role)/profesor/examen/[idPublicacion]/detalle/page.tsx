"use client";

import { use } from "react";
import { useGetDetalleEvaluacion } from "@/hooks/useEvaluaciones";
import type { GrupoPreguntaDetalle, PreguntaDetalle, OpcionDetalle } from "@/types/index";

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  mc: { label: "Múltiple", className: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
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

export default function DetallePlantillaPage({ params }: { params: Promise<{ idPublicacion: string }> }) {
  const { idPublicacion } = use(params);
  const idPub = Number(idPublicacion);

  const { data: detalle, isLoading } = useGetDetalleEvaluacion(idPub);

  if (isLoading) {
    return (
      <p className="text-sm font-medium text-slate-400 italic">
        Cargando plantilla de preguntas...
      </p>
    );
  }

  if (!detalle) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400">
        No se encontró la evaluación.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 antialiased">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{detalle.titulo}</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {detalle.materia} &middot; {detalle.division}
        </p>
      </div>

      <section
        className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Configuración de calificación"
      >
        <ScoringSummary label="Escala" value={`0 a ${detalle.escalaCalificacion}`} />
        <ScoringSummary label="Aprobación" value={String(detalle.notaAprobacion)} />
        <ScoringSummary
          label="Puntajes"
          value={detalle.modoPuntaje === "iguales" ? "Iguales" : "Personalizados"}
        />
        <ScoringSummary
          label="Vista del alumno"
          value={detalle.mostrarPuntajePorPregunta ? "Puntaje visible" : "Puntaje oculto"}
        />
      </section>

      {detalle.grupos.map((grupo: GrupoPreguntaDetalle) => (
        <div key={grupo.idGrupo} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">{grupo.tituloReferencia}</h3>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
              {grupo.puntajeMaximo ?? 0} / {detalle.escalaCalificacion} puntos
            </span>
          </div>

          {grupo.preguntas.length === 0 && (
            <p className="text-xs text-slate-400 italic">Sin preguntas en este grupo.</p>
          )}

          <div className="space-y-3">
            {grupo.preguntas.map((p: PreguntaDetalle) => (
              <div key={p.idPregunta} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{p.enunciado}</p>
                  <BadgeTipo tipo={p.tipo} />
                </div>

                {p.tipo !== "abierta" && p.tipo !== "code" && p.opciones?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {p.opciones.map((op: OpcionDetalle) => (
                      <div
                        key={op.idOpcion}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                          op.esCorrecta
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        <span className="font-mono text-xs">{op.esCorrecta ? "✓" : "✗"}</span>
                        <span>{op.texto}</span>
                      </div>
                    ))}
                  </div>
                )}

                {(p.tipo === "abierta" || p.tipo === "code") && (
                  <p className="mt-3 text-xs text-slate-400 italic">
                    Pregunta abierta &mdash; sin opciones predefinidas.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoringSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="mt-0.5 block text-sm font-black text-slate-800">{value}</span>
    </div>
  );
}
