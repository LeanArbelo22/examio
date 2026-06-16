"use client";

import { use } from "react";
import { useGetDetalleEvaluacion } from "@/hooks/useEvaluaciones";
import type { EvaluacionDetalle, GrupoPreguntaDetalle, PreguntaDetalle, OpcionDetalle } from "@/types/index";

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

      {detalle.grupos.map((grupo: GrupoPreguntaDetalle) => (
        <div key={grupo.idGrupo} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <h3 className="text-base font-bold text-slate-900 mb-4">{grupo.tituloReferencia}</h3>

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
