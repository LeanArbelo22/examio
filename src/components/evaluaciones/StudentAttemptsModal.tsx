"use client";

import Link from "next/link";
import { useState } from "react";
import {
  useGetIntentosAlumnoPublicacion,
  useRestaurarSeleccionAutomaticaIntento,
  useSeleccionarIntentoValido,
} from "@/hooks/useEvaluaciones";
import type { AlumnoIntento, IntentoAlumnoPublicacion } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge";

interface StudentAttemptsModalProps {
  idPublicacion: number;
  alumno: AlumnoIntento | null;
  onClose: () => void;
}

const stateLabels: Record<IntentoAlumnoPublicacion["estado"], string> = {
  en_progreso: "En progreso",
  entregado: "Entregado",
  vencido: "Vencido",
  anulado: "Anulado",
};

const stateTones: Record<IntentoAlumnoPublicacion["estado"], StatusBadgeTone> = {
  en_progreso: "warning",
  entregado: "success",
  vencido: "neutral",
  anulado: "danger",
};

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Sin finalizar";
}

export function StudentAttemptsModal({
  idPublicacion,
  alumno,
  onClose,
}: StudentAttemptsModalProps) {
  const matricula = alumno?.matricula ?? 0;
  const [candidate, setCandidate] = useState<number | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const attemptsQuery = useGetIntentosAlumnoPublicacion(
    idPublicacion,
    alumno?.matricula ?? null,
  );
  const selectAttempt = useSeleccionarIntentoValido(idPublicacion, matricula);
  const restoreAutomatic = useRestaurarSeleccionAutomaticaIntento(
    idPublicacion,
    matricula,
  );

  const resetAndClose = () => {
    setCandidate(null);
    setConfirmRestore(false);
    setFeedback(null);
    onClose();
  };

  const attempts = (attemptsQuery.data ?? []) as IntentoAlumnoPublicacion[];
  const hasManualSelection = attempts.some(
    (attempt) =>
      attempt.esIntentoValido && attempt.seleccionIntentoValido === "manual",
  );
  const isMutating = selectAttempt.isPending || restoreAutomatic.isPending;

  const confirmSelection = async (idIntento: number) => {
    try {
      await selectAttempt.mutateAsync(idIntento);
      setCandidate(null);
      setFeedback("El intento elegido se usará como resultado académico.");
    } catch {
      setFeedback(null);
    }
  };

  const confirmAutomaticSelection = async () => {
    try {
      await restoreAutomatic.mutateAsync();
      setConfirmRestore(false);
      setFeedback("Se restauró la selección automática del último intento entregado.");
    } catch {
      setFeedback(null);
    }
  };

  return (
    <Modal
      isOpen={alumno !== null}
      onClose={resetAndClose}
      title={
        alumno
          ? `Intentos de ${alumno.apellido}, ${alumno.nombre}`
          : "Intentos del alumno"
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-xl text-xs leading-5 text-slate-500">
            El intento marcado como válido es el que se toma para el resultado
            académico. Por defecto se utiliza el último intento entregado.
          </p>
          {hasManualSelection && !confirmRestore && (
            <Button
              type="button"
              onClick={() => setConfirmRestore(true)}
              disabled={isMutating}
              className="border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Volver a selección automática
            </Button>
          )}
        </div>

        {confirmRestore && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-900">
              Se volverá a tomar automáticamente el último intento entregado.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => setConfirmRestore(false)}
                disabled={isMutating}
                className="border border-amber-200 bg-white px-3 py-1.5 text-xs text-amber-900"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void confirmAutomaticSelection()}
                disabled={isMutating}
                className="bg-amber-700 px-3 py-1.5 text-xs font-bold text-white"
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}

        {feedback && <FeedbackMessage variant="success" message={feedback} />}
        {(selectAttempt.isError || restoreAutomatic.isError) && (
          <RequestErrorState
            error={selectAttempt.error ?? restoreAutomatic.error}
            fallback="No se pudo cambiar el intento válido."
          />
        )}
        {attemptsQuery.isLoading && (
          <LoadingState message="Cargando intentos del alumno..." />
        )}
        {attemptsQuery.isError && (
          <RequestErrorState
            error={attemptsQuery.error}
            fallback="No se pudieron cargar los intentos."
            onRetry={() => void attemptsQuery.refetch()}
          />
        )}
        {!attemptsQuery.isLoading && !attemptsQuery.isError && attempts.length === 0 && (
          <EmptyState
            title="El alumno todavía no realizó intentos"
            description="Los intentos aparecerán aquí cuando inicie la evaluación."
          />
        )}

        <div className="space-y-3" aria-busy={attemptsQuery.isFetching || isMutating}>
          {attempts.map((attempt) => {
            const canSelect =
              attempt.estado === "entregado" && !attempt.esIntentoValido;
            const isCandidate = candidate === attempt.idIntento;
            return (
              <article
                key={attempt.idIntento}
                className={`rounded-xl border p-4 ${
                  attempt.esIntentoValido
                    ? "border-indigo-200 bg-indigo-50/60"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black text-slate-800">
                        Intento {attempt.numeroIntento}
                      </h4>
                      <StatusBadge
                        label={stateLabels[attempt.estado]}
                        tone={stateTones[attempt.estado]}
                      />
                      {attempt.esIntentoValido && (
                        <StatusBadge
                          label={
                            attempt.seleccionIntentoValido === "manual"
                              ? "Resultado elegido"
                              : "Resultado actual"
                          }
                          tone="indigo"
                        />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Inicio: {formatDate(attempt.fechaInicio)} · Entrega:{" "}
                      {formatDate(attempt.fechaFin)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      Nota:{" "}
                      {attempt.notaFinal == null
                        ? "Pendiente de corrección"
                        : `${attempt.notaFinal.toFixed(2)} / ${attempt.escalaCalificacion}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      href={`/profesor/intento/${attempt.idIntento}`}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      Ver corrección
                    </Link>
                    {canSelect && !isCandidate && (
                      <Button
                        type="button"
                        onClick={() => setCandidate(attempt.idIntento)}
                        disabled={isMutating}
                        className="bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                      >
                        Elegir como resultado
                      </Button>
                    )}
                  </div>
                </div>

                {isCandidate && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      ¿Usar este intento como resultado académico del alumno?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => setCandidate(null)}
                        disabled={isMutating}
                        className="border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void confirmSelection(attempt.idIntento)}
                        disabled={isMutating}
                        className="bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Confirmar selección
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
