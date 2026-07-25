"use client";

import { use, useState, useEffect, useRef } from "react";
import {
  useGetExamenSorteado,
  useGetOpcionesPregunta,
  useGuardarRespuesta,
  usePendingAnswer,
} from "@/hooks/useEvaluaciones";

export default function ActivityPage({ params }: { params: Promise<{ id: string; actividadId: string }> }) {
  const { id, actividadId } = use(params);
  const idIntento = Number(id);
  const questionIndex = parseInt(actividadId) - 1;

  const [openText, setOpenText] = useState("");
  const [isPersistingDraft, setIsPersistingDraft] = useState(false);
  const draftTimerRef = useRef<number | undefined>(undefined);
  const restoredQuestionRef = useRef<string | undefined>(undefined);

  const { data: preguntas } = useGetExamenSorteado(idIntento);
  const currentQuestion = preguntas?.[questionIndex] ?? null;

  const { data: opciones } = useGetOpcionesPregunta(currentQuestion?.idPregunta || 0, idIntento);
  const {
    mutate: enviarRespuesta,
    isPending: isSaving,
    persistPending,
  } = useGuardarRespuesta();
  const pendingAnswer = usePendingAnswer(
    idIntento,
    currentQuestion?.idPregunta ?? 0,
  );

  const openTextRef = useRef(openText);
  useEffect(() => {
    openTextRef.current = openText;
  }, [openText]);

  useEffect(() => {
    return () => {
      window.clearTimeout(draftTimerRef.current);
      if (
        currentQuestion?.idPregunta &&
        (currentQuestion.tipo ?? "").toLowerCase() === "abierta"
      ) {
        const text = openTextRef.current.trim();
        if (text) {
          enviarRespuesta({
            IdIntento: idIntento,
            IdPregunta: currentQuestion.idPregunta,
            RtaTexto: text,
          });
        }
      }
    };
  }, [
    actividadId,
    currentQuestion?.idPregunta,
    currentQuestion?.tipo,
    enviarRespuesta,
    idIntento,
  ]);

  useEffect(() => {
    if (currentQuestion?.idPregunta) {
      Promise.resolve().then(() => {
        const questionKey = `${idIntento}:${currentQuestion.idPregunta}`;
        if (pendingAnswer?.payload.RtaTexto !== undefined) {
          setOpenText(pendingAnswer.payload.RtaTexto);
          restoredQuestionRef.current = questionKey;
          return;
        }
        if (restoredQuestionRef.current === questionKey) return;

        const storedText = localStorage.getItem(`examio_rta_abierta_${idIntento}_${currentQuestion.idPregunta}`);
        setOpenText(storedText ?? "");
        restoredQuestionRef.current = questionKey;
        if (storedText !== null) {
          void persistPending({
            IdIntento: idIntento,
            IdPregunta: currentQuestion.idPregunta,
            RtaTexto: storedText,
          }).then(() => {
            localStorage.removeItem(
              `examio_rta_abierta_${idIntento}_${currentQuestion.idPregunta}`,
            );
          });
        }
      });
    }
  }, [
    idIntento,
    currentQuestion?.idPregunta,
    pendingAnswer?.payload.RtaTexto,
    pendingAnswer?.version,
    persistPending,
  ]);

  const handleSeleccionarOpcion = (idOpcion: number) => {
    if (!currentQuestion?.idPregunta) return;

    enviarRespuesta({
      IdIntento: idIntento,
      IdPregunta: currentQuestion.idPregunta,
      IdOpcionNueva: idOpcion,
    });
  };

  const handleOpenTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const texto = e.target.value;
    setOpenText(texto);
    openTextRef.current = texto;
    if (currentQuestion?.idPregunta) {
      setIsPersistingDraft(true);
      const payload = {
        IdIntento: idIntento,
        IdPregunta: currentQuestion.idPregunta,
        RtaTexto: texto,
      };
      void persistPending(payload);
      window.clearTimeout(draftTimerRef.current);
      draftTimerRef.current = window.setTimeout(() => {
        enviarRespuesta(payload, {
          onSettled: () => setIsPersistingDraft(false),
        });
      }, 750);
    }
  };

  const handleTextBlur = () => {
    if (!currentQuestion?.idPregunta) return;
    window.clearTimeout(draftTimerRef.current);
    setIsPersistingDraft(true);
    const text = openText.trim();
    openTextRef.current = text;
    enviarRespuesta({
      IdIntento: idIntento,
      IdPregunta: currentQuestion.idPregunta,
      RtaTexto: text,
    }, {
      onSettled: () => setIsPersistingDraft(false),
    });
  };

  if (!currentQuestion) {
    return (
      <div className="text-center p-4">
        <p className="text-sm font-semibold text-slate-700">Buscando reactivo en el entorno seguro...</p>
      </div>
    );
  }

  const selectedOptionId =
    pendingAnswer?.payload.IdOpcionNueva ??
    opciones?.find((option) => option.fueSeleccionada)?.idOpcion;
  const hasAnswer =
    selectedOptionId !== undefined || openText.trim().length > 0;
  const answerStatus = isSaving || isPersistingDraft
    ? { label: "Guardando…", className: "bg-blue-50 text-blue-700" }
    : pendingAnswer?.state === "failed"
      ? { label: "Error de guardado", className: "bg-rose-50 text-rose-700" }
      : pendingAnswer?.state === "pending"
        ? {
            label: "Pendiente de sincronización",
            className: "bg-amber-50 text-amber-700",
          }
        : hasAnswer
          ? { label: "Guardado", className: "bg-emerald-50 text-emerald-700" }
          : null;

  return (
    <div key={`${idIntento}_${actividadId}`} className="space-y-6 antialiased">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">EXAMIO Entorno Seguro</span>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">
            Pregunta {actividadId} de {preguntas?.length}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {answerStatus && (
            <span
              role="status"
              className={`text-xs font-semibold px-2.5 py-1 rounded-md ${answerStatus.className}`}
            >
              {answerStatus.label}
            </span>
          )}
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
            Obligatoria
          </span>
        </div>
      </div>

      <div className="text-slate-700 text-sm md:text-base leading-relaxed font-medium bg-slate-50 border border-slate-100 p-4 rounded-xl">
        {currentQuestion.enunciado}
      </div>

      <div className="space-y-3 pt-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Seleccioná una opción:
        </p>
        
        {opciones?.map((option) => {
          const idOpcion = option.idOpcion;
          const texto = option.texto;
          const isSelected = selectedOptionId === idOpcion;

          return (
            <div
              key={idOpcion}
              onClick={() => handleSeleccionarOpcion(idOpcion)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer select-none ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                isSelected ? 'border-indigo-600 bg-indigo-600 scale-100' : 'border-slate-300 bg-white'
              }`}>
                {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
              <span className="leading-tight">{texto}</span>
            </div>
          );
        })}

        {(currentQuestion.tipo ?? "").toLowerCase() === "abierta" && (
          <textarea
            rows={4}
            placeholder="Escribí tu respuesta en formato de ensayo libre..."
            value={openText}
            onChange={handleOpenTextChange}
            onBlur={handleTextBlur}
            className="block w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all resize-none font-medium"
          />
        )}
      </div>
    </div>
  );
}
