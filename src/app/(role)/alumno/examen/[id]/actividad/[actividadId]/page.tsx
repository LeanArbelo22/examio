"use client";

import { use, useState, useEffect, useRef } from "react";
import { useGetExamenSorteado, useGetOpcionesPregunta, useGuardarRespuesta } from "@/hooks/useEvaluaciones";

export default function ActivityPage({ params }: { params: Promise<{ id: string; actividadId: string }> }) {
  const { id, actividadId } = use(params);
  const idIntento = Number(id);
  const questionIndex = parseInt(actividadId) - 1;

  const [openText, setOpenText] = useState("");

  const { data: preguntas } = useGetExamenSorteado(idIntento);
  const currentQuestion = preguntas?.[questionIndex] ?? null;

  const { data: opciones } = useGetOpcionesPregunta(currentQuestion?.idPregunta || 0, idIntento);
  const { mutate: enviarRespuesta } = useGuardarRespuesta();

  const openTextRef = useRef(openText);
  useEffect(() => {
    openTextRef.current = openText;
  }, [openText]);

  useEffect(() => {
    return () => {
      if (currentQuestion?.idPregunta) {
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
  }, [actividadId, currentQuestion?.idPregunta, enviarRespuesta, idIntento]);

  useEffect(() => {
    if (currentQuestion?.idPregunta) {
      Promise.resolve().then(() => {
        const storedText = localStorage.getItem(`examio_rta_abierta_${idIntento}_${currentQuestion.idPregunta}`);
        setOpenText(storedText ?? "");
      });
    }
  }, [idIntento, currentQuestion?.idPregunta]);

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
    if (currentQuestion?.idPregunta) {
      localStorage.setItem(`examio_rta_abierta_${idIntento}_${currentQuestion.idPregunta}`, texto);
    }
  };

  const handleTextBlur = () => {
    if (!currentQuestion?.idPregunta) return;
    const text = openText.trim();
    enviarRespuesta({
      IdIntento: idIntento,
      IdPregunta: currentQuestion.idPregunta,
      RtaTexto: text,
    });
  };

  if (!currentQuestion) {
    return (
      <div className="text-center p-4">
        <p className="text-sm font-semibold text-slate-700">Buscando reactivo en el entorno seguro...</p>
      </div>
    );
  }

  return (
    <div key={`${idIntento}_${actividadId}`} className="space-y-6 antialiased">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">EXAMIO Entorno Seguro</span>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">
            Pregunta {actividadId} de {preguntas?.length}
          </h2>
        </div>
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
          Obligatoria
        </span>
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
          const isSelected = option.fueSeleccionada === true;

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
