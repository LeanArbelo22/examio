"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useGetIntentoCompleto, useMutateCalificarIntento, useCorregirRespuestaAbierta } from "@/hooks/useEvaluaciones";
import type { IntentoCompleto, PreguntaIntento, OpcionIntento } from "@/types/index";

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

export default function RadiografiaPage({ params }: { params: Promise<{ idIntento: string }> }) {
  const { idIntento } = use(params);
  const idInt = Number(idIntento);

  const { data, isLoading } = useGetIntentoCompleto(idInt);
  const { mutate: calificar, isPending: isSaving } = useMutateCalificarIntento();
  const { mutate: corregir } = useCorregirRespuestaAbierta(idInt);

  const [notaInput, setNotaInput] = useState("");
  const [comentarios, setComentarios] = useState<Record<number, string>>({});

  useEffect(() => {
    if (data) {
      if (data.notaFinal !== null && notaInput === "") {
        setNotaInput(String(data.notaFinal));
      }
      const nuevosComentarios: Record<number, string> = {};
      data.preguntas.forEach(p => {
          if (p.respuesta?.comentariosDocente) {
              nuevosComentarios[p.idPregunta] = p.respuesta.comentariosDocente;
          }
      });
      setComentarios(nuevosComentarios);
    }
  }, [data, notaInput]);

  function notaInputValid(): boolean {
    if (notaInput === "") return false;
    const n = parseFloat(notaInput);
    if (isNaN(n) || n < 0 || n > 10) return false;
    if (notaInput.includes(".") && notaInput.split(".")[1].length > 2) return false;
    return true;
  }

  function handleGuardarNota() {
    if (!notaInputValid()) return;
    const n = Math.round(parseFloat(notaInput) * 100) / 100;
    calificar({ idIntento: idInt, notaFinal: n });
  }

  if (isLoading) {
    return (
      <p className="text-sm font-medium text-slate-400 italic">
        Cargando radiograf&iacute;a del examen...
      </p>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400">
        No se encontr&oacute; el intento.
      </div>
    );
  }

  const tieneNotaFinal = data.notaFinal !== null;
  const nota = tieneNotaFinal ? data.notaFinal : data.notaAutomatica;

  function notaColor(): string {
    if (!tieneNotaFinal) return "text-slate-700";
    return nota !== null && nota >= 6 ? "text-emerald-600" : "text-red-500";
  }

  return (
    <div className="grid grid-cols-1 gap-6 antialiased">
      {/* Cabecera del alumno */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {data.apellido}, {data.nombre}
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {data.correo}
            </p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nota</p>
              <p className={`text-2xl font-black ${nota !== null ? notaColor() : "text-slate-300"}`}>
                {nota !== null ? nota.toFixed(1) : "—"}
              </p>
            </div>
            <Link
              href={`/profesor/examen/${data.idPublicacion}`}
              className="bg-indigo-600 text-white text-xs font-bold py-2.5 px-5 rounded-xl hover:bg-indigo-700 shadow-sm transition-all shrink-0"
            >
              Volver al Examen
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-slate-100 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Examen</p>
            <p className="font-bold text-slate-800 mt-1">{data.tituloEvaluacion}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Intento</p>
            <p className="font-bold text-slate-800 mt-1">{data.numeroIntento}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Duraci&oacute;n</p>
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

      {/* CAJA DE CALIFICACIÓN MANUAL */}
      {data.estado !== "en_progreso" && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 block mb-1.5">
                Calificaci&oacute;n manual
              </label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={notaInput}
                onChange={(e) => setNotaInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="0.0 &ndash; 10.0"
              />
            </div>
            <button
              onClick={handleGuardarNota}
              disabled={isSaving || !notaInputValid()}
              className="bg-indigo-600 text-white text-xs font-bold py-2.5 px-6 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {isSaving ? "Guardando..." : "Guardar Nota"}
            </button>
          </div>
        </div>
      )}

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

                  let bg = "bg-slate-50 border-slate-100 text-slate-500";
                  let icon = "○";
                  let badge: { label: string; className: string } | null = null;

                  if (isCorrect && isSelected) {
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
              </div>
            )}

            {(p.tipo === "abierta" || p.tipo === "code") && (
              <div className={`border ${
                p.respuesta?.esCorrecta === true ? 'border-emerald-200 bg-emerald-50/20' :
                p.respuesta?.esCorrecta === false ? 'border-red-200 bg-red-50/20' :
                'border-slate-200 bg-white'
              } rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]`}>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap mb-4">
                  {p.respuesta?.rtaTexto || (
                    <span className="italic text-slate-400">Sin respuesta</span>
                  )}
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => corregir({ idPregunta: p.idPregunta, esCorrecta: true, comentariosDocente: comentarios[p.idPregunta] || null })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                        p.respuesta?.esCorrecta === true
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'text-slate-400 border-slate-300 hover:bg-emerald-50 hover:text-emerald-600'
                      }`}
                    >
                      ✓ Correcta
                    </button>
                    <button
                      onClick={() => corregir({ idPregunta: p.idPregunta, esCorrecta: false, comentariosDocente: comentarios[p.idPregunta] || null })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                        p.respuesta?.esCorrecta === false
                          ? 'bg-red-600 text-white border-red-600'
                          : 'text-slate-400 border-slate-300 hover:bg-red-50 hover:text-red-600'
                      }`}
                    >
                      ✗ Incorrecta
                    </button>
                  </div>
                  <div className="w-full md:w-auto flex items-center gap-2">
                    <textarea
                      rows={2}
                      cols={50}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Escribe una devolución para el alumno..."
                      value={comentarios[p.idPregunta] || ""}
                      onChange={(e) => setComentarios(prev => ({ ...prev, [p.idPregunta]: e.target.value }))}
                    />
                    <button
                      onClick={() => corregir({ idPregunta: p.idPregunta, esCorrecta: p.respuesta?.esCorrecta ?? null, comentariosDocente: comentarios[p.idPregunta] })}
                      disabled={comentarios[p.idPregunta] === (p.respuesta?.comentariosDocente || "")}
                      className="bg-indigo-600 text-white text-xs font-bold py-2 px-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
