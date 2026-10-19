"use client";

import { FormEvent, useId, useState } from "react";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { getUserErrorMessage } from "@/lib/errors";
import {
  formatGrade,
  formatGradeInput,
  parseGradeInput,
} from "@/lib/attempt-grading";
import { useCorregirPreguntaIntento } from "@/hooks/useEvaluaciones";
import type { OpcionIntento, PreguntaIntento } from "@/types";

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  mc: { label: "Selección única", className: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  multiple: { label: "Selección múltiple", className: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  vf: { label: "V/F", className: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  abierta: { label: "Abierta", className: "border-purple-200 bg-purple-50 text-purple-700" },
  code: { label: "Código", className: "border-purple-200 bg-purple-50 text-purple-700" },
};

const CORRECTION_STRATEGY = {
  exacta: {
    label: "Coincidencia exacta",
    help: "La selección debe coincidir completamente con las respuestas correctas.",
  },
  parcial_sin_penalizacion: {
    label: "Puntaje parcial sin descuento",
    help: "Suma las respuestas correctas elegidas sin descontar las incorrectas.",
  },
  parcial_penalizada: {
    label: "Puntaje parcial con descuento",
    help: "Suma los aciertos y descuenta las respuestas incorrectas elegidas.",
  },
} as const;

function AnswerOptions({ options }: { options: OpcionIntento[] }) {
  if (options.length === 0) {
    return <p className="text-sm italic text-slate-500">Sin respuesta seleccionada.</p>;
  }

  const hasSelection = options.some(
    (option) => option.fueSeleccionada === true || option.fueSeleccionada === 1,
  );
  const totalCorrect = options.filter((option) => option.esCorrecta).length;
  const selectedCorrect = options.filter(
    (option) =>
      option.esCorrecta &&
      (option.fueSeleccionada === true || option.fueSeleccionada === 1),
  ).length;
  const selectedIncorrect = options.filter(
    (option) =>
      !option.esCorrecta &&
      (option.fueSeleccionada === true || option.fueSeleccionada === 1),
  ).length;

  return (
    <div className="space-y-2">
      {!hasSelection && (
        <p className="mb-2 text-sm italic text-slate-500">El alumno omitió esta pregunta.</p>
      )}
      {hasSelection && totalCorrect > 0 && (
        <p className="mb-2 text-xs font-semibold text-slate-600">
          Seleccionó {selectedCorrect} de {totalCorrect} opciones correctas
          {selectedIncorrect > 0
            ? ` y ${selectedIncorrect} ${selectedIncorrect === 1 ? "incorrecta" : "incorrectas"}.`
            : "."}
        </p>
      )}
      {options.map((option) => {
        const selected = option.fueSeleccionada === true || option.fueSeleccionada === 1;
        const classes = option.esCorrecta && selected
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : option.esCorrecta
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : selected
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-slate-200 bg-slate-50 text-slate-600";
        const label = option.esCorrecta && selected
          ? "Elegida · correcta"
          : option.esCorrecta
            ? "Correcta no elegida"
            : selected
              ? "Elegida · incorrecta"
              : "";

        return (
          <div
            key={option.idOpcion}
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${classes}`}
          >
            <span>{option.texto}</span>
            <span className="shrink-0 text-xs font-bold">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function QuestionCorrectionCard({
  idIntento,
  question,
  readOnly = false,
}: {
  idIntento: number;
  question: PreguntaIntento;
  readOnly?: boolean;
}) {
  const scoreId = useId();
  const commentId = useId();
  const [scoreInput, setScoreInput] = useState(
    formatGradeInput(question.puntajeObtenido),
  );
  const [comment, setComment] = useState(
    question.comentariosDocente ?? question.respuesta?.comentariosDocente ?? "",
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const correction = useCorregirPreguntaIntento(idIntento);
  const maximum = question.puntajeMaximo;
  const parsed = maximum === null
    ? { value: null, error: "El backend no informó el puntaje máximo." }
    : parseGradeInput(scoreInput, maximum);
  const initialComment = question.comentariosDocente ?? question.respuesta?.comentariosDocente ?? "";
  const dirty =
    scoreInput !== formatGradeInput(question.puntajeObtenido) ||
    comment !== initialComment;
  const status = question.puntajeObtenido === null ? "Pendiente" : "Corregida";
  const type = TYPE_BADGE[question.tipo];
  const requiresManualAnswerCorrection = question.tipo === "abierta" || question.tipo === "code";
  const correctionStrategy = CORRECTION_STRATEGY[question.estrategiaCorreccion ?? "exacta"];
  const justificationEnabled =
    (question.modoJustificacion ?? "sin_justificacion") !== "sin_justificacion";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);
    if (parsed.value === null || parsed.error || readOnly) return;

    try {
      await correction.mutateAsync({
        idPregunta: question.idPregunta,
        payload: {
          puntajeObtenido: parsed.value,
          comentariosDocente: comment.trim() || null,
        },
      });
      setSuccessMessage("Corrección guardada. La nota del intento fue recalculada.");
    } catch {
      // React Query conserva el error para presentarlo debajo del formulario.
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {question.grupoConceptualmente && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {question.grupoConceptualmente}
            </p>
          )}
          <h3 className="text-sm font-semibold text-slate-900">{question.enunciado}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {type && (
            <span className={`rounded-md border px-2 py-1 text-xs font-bold ${type.className}`}>
              {type.label}
            </span>
          )}
          <span
            className={`rounded-md px-2 py-1 text-xs font-bold ${
              question.puntajeObtenido === null
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Respuesta del alumno
        </p>
        {question.tipo === "abierta" || question.tipo === "code" ? (
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {question.respuesta?.rtaTexto || (
              <span className="italic text-slate-500">Sin respuesta.</span>
            )}
          </p>
        ) : (
          <AnswerOptions options={question.opciones} />
        )}
        {(question.modoJustificacion ?? "sin_justificacion") !== "sin_justificacion" && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              Justificación del alumno
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {question.respuesta?.justificacion || (
                <span className="italic text-slate-500">Sin justificación.</span>
              )}
            </p>
          </div>
        )}
      </div>

      <div
        aria-label="Configuración de corrección aplicada"
        className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-slate-700"
      >
        <p>
          <span className="font-semibold text-slate-900">Forma de corrección: </span>
          {requiresManualAnswerCorrection ? "Corrección docente" : correctionStrategy.label}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          {requiresManualAnswerCorrection
            ? "El puntaje debe ser asignado por el docente."
            : correctionStrategy.help}
        </p>
        {justificationEnabled && (
          <p className="mt-2 border-t border-indigo-100 pt-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Uso de la justificación: </span>
            {question.tratamientoJustificacion === "revision_manual"
              ? "requiere revisión docente antes de definir el puntaje."
              : "informativa; no modifica el puntaje automático."}
          </p>
        )}
      </div>

      {question.tratamientoJustificacion === "revision_manual" && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-bold">Requiere revisión docente</p>
          <p className="mt-1">
            Las opciones aportan un puntaje sugerido de{" "}
            <strong>{formatGrade(question.puntajeAutomaticoOpciones)}</strong>,
            pero tenés que confirmar el puntaje final de esta pregunta.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
        <span>Puntaje máximo: <strong>{formatGrade(maximum)}</strong></span>
        {question.puntajeAutomaticoOpciones !== undefined &&
          question.puntajeAutomaticoOpciones !== null &&
          question.tratamientoJustificacion !== "revision_manual" && (
            <span>
              Puntaje por opciones:{" "}
              <strong>{formatGrade(question.puntajeAutomaticoOpciones)}</strong>
            </span>
          )}
        <span>
          Origen: <strong>{question.origenCorreccion === "automatica" ? "Automático" : question.origenCorreccion === "manual" ? "Manual" : "Pendiente"}</strong>
        </span>
        {question.fechaCorreccion && (
          <span>Última corrección: <strong>{new Date(question.fechaCorreccion).toLocaleString("es-AR")}</strong></span>
        )}
      </div>

      {!readOnly && (
        <form onSubmit={handleSubmit} className="mt-5 border-t border-slate-100 pt-5" noValidate>
          <div className="grid gap-4 md:grid-cols-[minmax(150px,220px)_1fr]">
            <div>
              <label htmlFor={scoreId} className="mb-1.5 block text-sm font-bold text-slate-700">
                Puntaje obtenido
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={scoreId}
                  type="number"
                  min={0}
                  max={maximum ?? undefined}
                  step="0.01"
                  value={scoreInput}
                  onChange={(event) => {
                    setScoreInput(event.target.value);
                    setSuccessMessage(null);
                  }}
                  aria-describedby={`${scoreId}-help ${scoreId}-error`}
                  aria-invalid={Boolean(scoreInput && parsed.error)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <span className="shrink-0 text-sm text-slate-600">/ {formatGrade(maximum)}</span>
              </div>
              <p id={`${scoreId}-help`} className="mt-1 text-xs text-slate-500">
                Admite hasta dos decimales.
              </p>
              {scoreInput && parsed.error && (
                <p id={`${scoreId}-error`} className="mt-1 text-xs font-medium text-red-700">
                  {parsed.error}
                </p>
              )}
              {maximum !== null && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setScoreInput("0")}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Asignar cero
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreInput(formatGradeInput(maximum))}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Asignar máximo
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor={commentId} className="mb-1.5 block text-sm font-bold text-slate-700">
                Devolución del docente <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <textarea
                id={commentId}
                rows={4}
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value);
                  setSuccessMessage(null);
                }}
                className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Explicá el criterio o la devolución para el alumno."
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Guardar una corrección manual reemplaza cualquier autocorrección anterior y queda auditado.
            </p>
            <button
              type="submit"
              disabled={!dirty || parsed.value === null || Boolean(parsed.error) || correction.isPending}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {correction.isPending ? "Guardando..." : "Guardar corrección"}
            </button>
          </div>

          {successMessage && (
            <div className="mt-4"><FeedbackMessage variant="success" message={successMessage} /></div>
          )}
          {correction.isError && (
            <div className="mt-4">
              <FeedbackMessage
                variant="error"
                message={getUserErrorMessage(correction.error, "No se pudo guardar la corrección.")}
              />
            </div>
          )}
        </form>
      )}
    </article>
  );
}
