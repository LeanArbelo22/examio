"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import {
  useGetExamenSorteado,
  useGetOpcionesPregunta,
  useGuardarRespuesta,
  usePendingAnswer,
} from "@/hooks/useEvaluaciones";
import type {
  GuardarRespuestaPayload,
  OpcionSorteada,
  PreguntaSorteada,
} from "@/types";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";

interface AnswerDraft {
  selectedOptionIds: number[];
  text: string;
  justification: string;
}

function createEventId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function answerFromSources(
  question: PreguntaSorteada,
  options: OpcionSorteada[] | undefined,
  pending: ReturnType<typeof usePendingAnswer>,
): AnswerDraft {
  const server = question.respuesta;
  const pendingOptions = pending?.payload.IdOpcionesSeleccionadas ??
    (pending?.payload.IdOpcionNueva !== undefined
      ? [pending.payload.IdOpcionNueva]
      : undefined);

  return {
    selectedOptionIds:
      pendingOptions ??
      server?.idsOpcionesSeleccionadas ??
      options?.filter((option) => option.fueSeleccionada).map((option) => option.idOpcion) ??
      [],
    text: pending?.payload.RtaTexto ?? server?.rtaTexto ?? "",
    justification:
      pending?.payload.Justificacion ?? server?.justificacion ?? "",
  };
}

export default function ActivityPage({
  params,
}: {
  params: Promise<{ id: string; actividadId: string }>;
}) {
  const { id, actividadId } = use(params);
  const idIntento = Number(id);
  const questionIndex = Number.parseInt(actividadId, 10) - 1;
  const draftTimerRef = useRef<number | undefined>(undefined);
  const latestPayloadRef = useRef<GuardarRespuestaPayload | undefined>(undefined);
  const restoredKeyRef = useRef<string | undefined>(undefined);
  const conflictRefreshedVersionRef = useRef<string | undefined>(undefined);

  const {
    data: preguntas,
    refetch: refetchQuestions,
  } = useGetExamenSorteado(idIntento);
  const currentQuestion = preguntas?.[questionIndex] ?? null;
  const {
    data: opciones,
    refetch: refetchOptions,
  } = useGetOpcionesPregunta(currentQuestion?.idPregunta || 0, idIntento);
  const pendingAnswer = usePendingAnswer(
    idIntento,
    currentQuestion?.idPregunta ?? 0,
  );
  const {
    mutate: synchronizeAnswer,
    isPending: isSaving,
    persistPending,
    restoreServerAnswer,
    retryLocalAnswer,
  } = useGuardarRespuesta();

  const [draft, setDraft] = useState<AnswerDraft>({
    selectedOptionIds: [],
    text: "",
    justification: "",
  });
  const [isPersistingDraft, setIsPersistingDraft] = useState(false);

  const questionKey = currentQuestion
    ? `${idIntento}:${currentQuestion.idPregunta}`
    : "";

  useEffect(() => {
    if (!currentQuestion) return;
    const source = answerFromSources(currentQuestion, opciones, pendingAnswer);
    const selectedOptionsVersion = opciones
      ?.filter((option) => option.fueSeleccionada)
      .map((option) => option.idOpcion)
      .join(",") ?? "";
    const sourceVersion = `${questionKey}:${pendingAnswer?.version ?? "server"}:${currentQuestion.respuesta?.revision ?? 0}:${selectedOptionsVersion}`;
    if (restoredKeyRef.current === sourceVersion) return;
    restoredKeyRef.current = sourceVersion;
    setDraft(source);
  }, [currentQuestion, opciones, pendingAnswer, questionKey]);

  useEffect(() => {
    if (
      !currentQuestion ||
      !pendingAnswer ||
      (pendingAnswer.payload.EventoId !== undefined &&
        pendingAnswer.payload.RevisionEsperada !== undefined)
    ) return;

    const migrated = answerFromSources(currentQuestion, opciones, pendingAnswer);
    const payload: GuardarRespuestaPayload = {
      IdIntento: idIntento,
      IdPregunta: currentQuestion.idPregunta,
      IdOpcionesSeleccionadas: migrated.selectedOptionIds,
      RtaTexto: migrated.text.trim() || null,
      Justificacion: migrated.justification.trim() || null,
      RevisionEsperada: currentQuestion.respuesta?.revision ?? 0,
      EventoId: createEventId(),
    };
    latestPayloadRef.current = payload;
    synchronizeAnswer(payload);
  }, [currentQuestion, idIntento, opciones, pendingAnswer, synchronizeAnswer]);

  useEffect(() => {
    if (
      pendingAnswer?.state !== "conflict" ||
      conflictRefreshedVersionRef.current === pendingAnswer.version
    ) return;
    conflictRefreshedVersionRef.current = pendingAnswer.version;
    void Promise.all([refetchQuestions(), refetchOptions()]);
  }, [pendingAnswer, refetchOptions, refetchQuestions]);

  useEffect(() => {
    return () => {
      window.clearTimeout(draftTimerRef.current);
      const latestPayload = latestPayloadRef.current;
      latestPayloadRef.current = undefined;
      if (latestPayload) {
        void persistPending(latestPayload);
      }
    };
  }, [persistPending, questionKey]);

  const isClosed = currentQuestion
    ? ["mc", "multiple", "vf"].includes(currentQuestion.tipo)
    : false;
  const supportsJustification =
    isClosed &&
    (currentQuestion?.modoJustificacion ?? "sin_justificacion") !==
      "sin_justificacion";
  const hasAnswer = isClosed
    ? draft.selectedOptionIds.length > 0
    : draft.text.trim().length > 0;
  const expectedRevision = Math.max(
    pendingAnswer?.payload.RevisionEsperada ?? 0,
    currentQuestion?.respuesta?.revision ?? 0,
  );

  const createPayload = (next: AnswerDraft): GuardarRespuestaPayload => ({
    IdIntento: idIntento,
    IdPregunta: currentQuestion?.idPregunta ?? 0,
    IdOpcionesSeleccionadas: isClosed ? next.selectedOptionIds : [],
    RtaTexto: isClosed ? null : next.text.trim() || null,
    Justificacion: supportsJustification
      ? next.justification.trim() || null
      : null,
    RevisionEsperada: expectedRevision,
    EventoId: createEventId(),
  });

  const saveImmediately = (next: AnswerDraft) => {
    if (!currentQuestion) return;
    setDraft(next);
    const payload = createPayload(next);
    latestPayloadRef.current = payload;
    synchronizeAnswer(payload);
  };

  const queueTextChange = (next: AnswerDraft) => {
    if (!currentQuestion) return;
    setDraft(next);
    setIsPersistingDraft(true);
    const payload = createPayload(next);
    latestPayloadRef.current = payload;
    void persistPending(payload);
    window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(() => {
      synchronizeAnswer(payload, {
        onSettled: () => setIsPersistingDraft(false),
      });
    }, 750);
  };

  const flushTextChange = () => {
    const payload = latestPayloadRef.current;
    if (!payload) return;
    window.clearTimeout(draftTimerRef.current);
    setIsPersistingDraft(true);
    synchronizeAnswer(payload, {
      onSettled: () => setIsPersistingDraft(false),
    });
  };

  const selectOption = (idOpcion: number) => {
    const selected = currentQuestion?.tipo === "multiple"
      ? draft.selectedOptionIds.includes(idOpcion)
        ? draft.selectedOptionIds.filter((optionId) => optionId !== idOpcion)
        : [...draft.selectedOptionIds, idOpcion].sort((a, b) => a - b)
      : [idOpcion];
    saveImmediately({ ...draft, selectedOptionIds: selected });
  };

  const answerStatus = useMemo(() => {
    if (pendingAnswer?.state === "conflict") {
      return { label: "Conflicto de guardado", className: "bg-rose-50 text-rose-700" };
    }
    if (pendingAnswer?.state === "failed") {
      return { label: "Error de guardado", className: "bg-rose-50 text-rose-700" };
    }
    if (isSaving || isPersistingDraft || pendingAnswer?.state === "syncing") {
      return { label: "Guardando…", className: "bg-blue-50 text-blue-700" };
    }
    if (pendingAnswer?.state === "pending") {
      return { label: "Pendiente de sincronización", className: "bg-amber-50 text-amber-700" };
    }
    if (hasAnswer) {
      return { label: "Guardado", className: "bg-emerald-50 text-emerald-700" };
    }
    return null;
  }, [hasAnswer, isPersistingDraft, isSaving, pendingAnswer?.state]);

  if (!currentQuestion) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm font-semibold text-slate-700">
          Buscando pregunta en el entorno seguro...
        </p>
      </div>
    );
  }

  return (
    <div key={`${idIntento}_${actividadId}`} className="space-y-6 antialiased">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            EXAMIO Entorno Seguro
          </span>
          <h2 className="mt-0.5 text-xl font-black tracking-tight text-slate-800">
            Pregunta {actividadId} de {preguntas?.length}
          </h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {currentQuestion.puntajeMaximo !== undefined && (
            <span className="rounded-md bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
              {currentQuestion.puntajeMaximo} punto
              {currentQuestion.puntajeMaximo === 1 ? "" : "s"}
            </span>
          )}
          {answerStatus && (
            <span
              role="status"
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${answerStatus.className}`}
            >
              {answerStatus.label}
            </span>
          )}
        </div>
      </div>

      {pendingAnswer?.state === "conflict" && (
        <div className="space-y-3">
          <FeedbackMessage
            variant="error"
            message="Esta respuesta cambió en otra pestaña. Tu edición local sigue protegida; elegí qué versión conservar."
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void restoreServerAnswer(idIntento, currentQuestion.idPregunta)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Usar respuesta guardada
            </button>
            <button
              type="button"
              onClick={() => void retryLocalAnswer(
                idIntento,
                currentQuestion.idPregunta,
                currentQuestion.respuesta?.revision ?? 0,
              )}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Guardar mi respuesta
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-700 md:text-base">
        {currentQuestion.enunciado}
      </div>

      {isClosed ? (
        <fieldset className="space-y-3 pt-2">
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            {currentQuestion.tipo === "multiple"
              ? "Seleccioná una o más opciones"
              : "Seleccioná una opción"}
          </legend>
          {opciones?.map((option) => {
            const selected = draft.selectedOptionIds.includes(option.idOpcion);
            return (
              <label
                key={option.idOpcion}
                className={`flex w-full cursor-pointer select-none items-center gap-4 rounded-xl border p-4 text-sm font-semibold transition-colors ${
                  selected
                    ? "border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <input
                  type={currentQuestion.tipo === "multiple" ? "checkbox" : "radio"}
                  name={`pregunta-${currentQuestion.idPregunta}`}
                  checked={selected}
                  onChange={() => selectOption(option.idOpcion)}
                  className="h-5 w-5 shrink-0 accent-indigo-600"
                />
                <span className="leading-tight">{option.texto}</span>
              </label>
            );
          })}
          {draft.selectedOptionIds.length > 0 && (
            <button
              type="button"
              onClick={() => saveImmediately({ ...draft, selectedOptionIds: [] })}
              className="text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline"
            >
              Limpiar respuesta
            </button>
          )}
        </fieldset>
      ) : (
        <div>
          <label
            htmlFor={`respuesta-${currentQuestion.idPregunta}`}
            className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            Tu respuesta
          </label>
          <textarea
            id={`respuesta-${currentQuestion.idPregunta}`}
            rows={currentQuestion.tipo === "code" ? 8 : 5}
            placeholder={
              currentQuestion.tipo === "code"
                ? "Escribí tu solución..."
                : "Escribí tu respuesta..."
            }
            value={draft.text}
            onChange={(event) => queueTextChange({ ...draft, text: event.target.value })}
            onBlur={flushTextChange}
            className="block w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      )}

      {supportsJustification && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label
            htmlFor={`justificacion-${currentQuestion.idPregunta}`}
            className="block text-sm font-bold text-slate-700"
          >
            Justificación
            {currentQuestion.modoJustificacion === "opcional" && (
              <span className="font-normal text-slate-500"> (opcional)</span>
            )}
          </label>
          <p id={`justificacion-ayuda-${currentQuestion.idPregunta}`} className="mt-1 text-xs text-slate-500">
            {currentQuestion.modoJustificacion === "obligatoria"
              ? "Podés explicar tu elección. Si dejás este campo vacío, se registrará como “Sin respuesta” al entregar."
              : "Podés explicar por qué elegiste esa respuesta."}
            {currentQuestion.tratamientoJustificacion === "revision_manual" &&
              " El docente revisará tu explicación antes de confirmar el puntaje."}
          </p>
          <textarea
            id={`justificacion-${currentQuestion.idPregunta}`}
            rows={3}
            maxLength={10000}
            value={draft.justification}
            onChange={(event) => queueTextChange({
              ...draft,
              justification: event.target.value,
            })}
            onBlur={flushTextChange}
            aria-describedby={`justificacion-ayuda-${currentQuestion.idPregunta}`}
            className="mt-3 block w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      )}
    </div>
  );
}
