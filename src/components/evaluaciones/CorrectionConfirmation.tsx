"use client";

import { useState } from "react";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { Modal } from "@/components/ui/Modal";
import { useConfirmarCorreccionIntento } from "@/hooks/useEvaluaciones";
import { getUserErrorMessage } from "@/lib/errors";
import type { IntentoCompleto } from "@/types";

export function CorrectionConfirmation({
  attempt,
  pendingCount,
}: {
  attempt: IntentoCompleto;
  pendingCount: number;
}) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const mutation = useConfirmarCorreccionIntento(attempt.idIntento);
  const isConfirmed = attempt.correccionConfirmada || mutation.isSuccess;
  const canConfirm = attempt.estado !== "en_progreso" && pendingCount === 0;

  async function confirmCorrection() {
    try {
      await mutation.mutateAsync();
      setConfirmationOpen(false);
    } catch {
      setConfirmationOpen(false);
    }
  }

  if (isConfirmed) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5" aria-labelledby="correction-confirmation-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="correction-confirmation-title" className="font-bold text-emerald-950">
              Corrección confirmada
            </h2>
            <p className="mt-1 text-sm text-emerald-800">
              La calificación quedó cerrada. La revisión dependerá de la política configurada para esta evaluación.
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            Finalizada
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-labelledby="correction-confirmation-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="correction-confirmation-title" className="font-bold text-slate-900">
            Confirmar corrección
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-700">
            {pendingCount > 0
              ? `Todavía ${pendingCount === 1 ? "queda una pregunta pendiente" : `quedan ${pendingCount} preguntas pendientes`}.`
              : "Todas las preguntas están corregidas. Confirmá para cerrar la calificación. La visibilidad de la revisión se administra por separado."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmationOpen(true)}
          disabled={!canConfirm || mutation.isPending}
          className="shrink-0 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirmar corrección
        </button>
      </div>

      {mutation.isError && (
        <div className="mt-4">
          <FeedbackMessage
            variant="error"
            message={getUserErrorMessage(
              mutation.error,
              "No se pudo confirmar la corrección.",
            )}
          />
        </div>
      )}

      <Modal
        isOpen={confirmationOpen}
        onClose={() => !mutation.isPending && setConfirmationOpen(false)}
        title="Confirmar corrección"
      >
        <p className="text-sm text-slate-700">
          La nota actual quedará confirmada. Esto no habilita por sí solo la revisión del alumno.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Si luego modificás un puntaje o la nota final, tendrás que confirmar nuevamente.
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
            onClick={() => void confirmCorrection()}
            disabled={mutation.isPending}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {mutation.isPending ? "Confirmando..." : "Confirmar corrección"}
          </button>
        </div>
      </Modal>
    </section>
  );
}
