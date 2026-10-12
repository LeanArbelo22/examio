"use client";

import { FormEvent, useId, useState } from "react";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { Modal } from "@/components/ui/Modal";
import { getUserErrorMessage } from "@/lib/errors";
import { formatGrade, formatGradeInput, parseGradeInput } from "@/lib/attempt-grading";
import { useMutateCalificarIntento } from "@/hooks/useEvaluaciones";
import type { IntentoCompleto } from "@/types";

export function FinalGradeOverride({ attempt }: { attempt: IntentoCompleto }) {
  const inputId = useId();
  const initialValue = attempt.notaFinalManual ?? attempt.notaFinal;
  const [input, setInput] = useState(formatGradeInput(initialValue));
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const mutation = useMutateCalificarIntento();
  const parsed = parseGradeInput(input, attempt.escalaCalificacion);
  const hasCompleteScoreSnapshots =
    attempt.preguntas.length > 0 &&
    attempt.preguntas.every((question) => question.puntajeMaximo !== null);
  const hasPendingNewCorrection =
    hasCompleteScoreSnapshots && attempt.notaFinalCalculada === null;
  const canOverride = !hasPendingNewCorrection;
  const dirty = input !== formatGradeInput(initialValue);

  function handleRequestConfirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);
    if (!canOverride || !dirty || parsed.value === null || parsed.error) return;
    setConfirmationOpen(true);
  }

  async function handleConfirm() {
    if (parsed.value === null) return;
    try {
      await mutation.mutateAsync({ idIntento: attempt.idIntento, notaFinal: parsed.value });
      setConfirmationOpen(false);
      setSuccessMessage("La nota final se guardó correctamente.");
    } catch {
      setConfirmationOpen(false);
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5" aria-labelledby={`${inputId}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${inputId}-title`} className="font-bold text-slate-900">Modificar nota final</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Si necesitás ajustar el resultado, ingresá la nota definitiva para este intento.
          </p>
        </div>
        {attempt.notaFinalManual !== null && (
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
            Nota modificada
          </span>
        )}
      </div>

      {hasPendingNewCorrection && (
        <div className="mt-4">
          <FeedbackMessage
            variant="warning"
            message="Corregí todas las preguntas antes de modificar la nota final."
          />
        </div>
      )}

      <form onSubmit={handleRequestConfirmation} className="mt-4 flex flex-wrap items-end gap-3" noValidate>
        <div className="min-w-[180px] flex-1">
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold text-slate-700">
            Nota final
          </label>
          <input
            id={inputId}
            type="number"
            min={0}
            max={attempt.escalaCalificacion}
            step="0.01"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setSuccessMessage(null);
            }}
            aria-describedby={`${inputId}-help ${inputId}-error`}
            aria-invalid={Boolean(input && parsed.error)}
            className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder={`0 – ${attempt.escalaCalificacion}`}
          />
          <p id={`${inputId}-help`} className="mt-1 text-xs text-slate-500">
            La escala es de {attempt.escalaCalificacion} puntos. La corrección por preguntas suma {formatGrade(attempt.notaFinalCalculada)}.
          </p>
          {input && parsed.error && (
            <p id={`${inputId}-error`} className="mt-1 text-xs font-medium text-red-700">{parsed.error}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={!canOverride || !dirty || parsed.value === null || Boolean(parsed.error) || mutation.isPending}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Guardar nota final
        </button>
      </form>

      {successMessage && <div className="mt-4"><FeedbackMessage variant="success" message={successMessage} /></div>}
      {mutation.isError && (
        <div className="mt-4">
          <FeedbackMessage
            variant="error"
            message={getUserErrorMessage(mutation.error, "No se pudo guardar la nota final manual.")}
          />
        </div>
      )}

      <Modal
        isOpen={confirmationOpen}
        onClose={() => !mutation.isPending && setConfirmationOpen(false)}
        title="Confirmar nota final"
      >
        <p className="text-sm text-slate-700">
          La nota final del intento será <strong>{formatGrade(parsed.value, attempt.escalaCalificacion)}</strong>.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          La calificación obtenida a partir de las respuestas seguirá disponible para consulta.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmationOpen(false)}
            disabled={mutation.isPending}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={mutation.isPending}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Guardando..." : "Confirmar cambio"}
          </button>
        </div>
      </Modal>
    </section>
  );
}
