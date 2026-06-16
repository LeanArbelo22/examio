"use client";

import { FullscreenWrapper } from "@/components/ui/FullscreenWrapper";
import { use, useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  useGetExamenSorteado,
  useFinalizarExamen,
} from "@/hooks/useEvaluaciones";
import { Button } from "@/components/ui/Button";

export default function ActivityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const urlParams = useParams();

  const idIntento = Number(id);
  const currentActivityId = parseInt(urlParams.actividadId as string) || 1;

  if (!idIntento || isNaN(idIntento)) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-sm font-bold text-slate-500">
        Error: ID de intento inválido.
      </div>
    );
  }

  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const autoSubmittedRef = useRef(false);

  const { data: preguntas, isLoading } = useGetExamenSorteado(idIntento);
  const { mutate: finalizarExamen, isPending: finalizando } =
    useFinalizarExamen();

  const totalQuestions = preguntas?.length || 0;

  const handlePrevious = () => {
    if (currentActivityId > 1) {
      router.push(`/alumno/examen/${id}/actividad/${currentActivityId - 1}`);
    }
  };

  const handleNext = () => {
    if (currentActivityId < totalQuestions) {
      router.push(`/alumno/examen/${id}/actividad/${currentActivityId + 1}`);
    }
  };

  const ejecutarCierreTransaccional = () => {
    setErrorServidor(null);

    const doc = document as any;
    doc.isExitingLegitimately = true;

    finalizarExamen(idIntento, {
      onSuccess: () => {
        if (document.fullscreenElement) {
          document
            .exitFullscreen()
            .then(() => {
              delete doc.isExitingLegitimately;
              router.replace("/alumno");
            })
            .catch(() => {
              router.replace("/alumno");
            });
        } else {
          router.replace("/alumno");
        }
      },
      onError: (error: any) => {
        delete doc.isExitingLegitimately;
        console.error("ERROR EN POST /finalizar-examen:");
        console.dir(error);
        setErrorServidor(
          error?.response?.data?.mensaje ||
            error?.message ||
            "Error de comunicación transaccional con el backend.",
        );
      },
    });
  };

  useEffect(() => {
    const stored = sessionStorage.getItem(`examio_deadline_${idIntento}`);
    if (!stored) return;

    const deadline = parseInt(stored, 10);
    const update = () => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        ejecutarCierreTransaccional();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [idIntento]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-sm font-bold text-slate-500">
        Ejecutando algoritmo de aleatoriedad perimetral en SQL Server...
      </div>
    );
  }

  return (
    <FullscreenWrapper idIntento={idIntento}>
      <div className="flex flex-col h-screen max-h-screen w-full bg-slate-50 text-slate-900 select-none overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex justify-between items-center z-10 shadow-sm shrink-0">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
              Entorno Seguro de Evaluación
            </span>
            <h1 className="text-base font-bold text-slate-800 tracking-tight leading-tight">
              Parcial Especializado — EXAMIO Entorno Seguro Activo
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl">
            <span className="text-sm">⏱️</span>
            <span className={`font-mono text-sm font-bold tracking-tight ${timeRemaining !== null && timeRemaining <= 120 ? 'text-red-600' : 'text-slate-700'}`}>
              {timeRemaining !== null ? `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')}` : "Entorno Protegido"}
            </span>
          </div>
        </header>

        {/* Cuerpo */}
        <main className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 bg-transparent">
            <div className="max-w-3xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              {children}
            </div>
          </div>

          {/* Panel de Control */}
          <div className="w-80 md:w-96 bg-white border-l border-slate-200/80 p-6 flex flex-col justify-between shadow-[-4px_0_12px_rgba(0,0,0,0.01)] shrink-0">
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5 mb-4 flex items-center gap-2">
                📋 Registro de Respuestas
              </h2>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {preguntas?.map((_, idx) => {
                  const stepNum = idx + 1;
                  const isCurrent = stepNum === currentActivityId;
                  return (
                    <button
                      key={stepNum}
                      disabled={finalizando}
                      onClick={() =>
                        router.push(`/alumno/examen/${id}/actividad/${stepNum}`)
                      }
                      className={`h-9 rounded-lg text-xs font-bold transition-all border ${
                        isCurrent
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm scale-105"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      } disabled:opacity-50`}
                    >
                      {stepNum}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 font-medium text-center">
                Pregunta {currentActivityId} de {totalQuestions}
              </p>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 gap-3">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentActivityId === 1 || finalizando}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1 py-2 px-3 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <button
                type="button"
                disabled={finalizando}
                onClick={
                  currentActivityId === totalQuestions
                    ? () => setShowConfirmModal(true)
                    : handleNext
                }
                className={`text-xs font-bold transition-all flex items-center gap-1 py-2 px-4 rounded-lg shadow-sm ${
                  currentActivityId === totalQuestions
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                } disabled:opacity-50`}
              >
                {currentActivityId === totalQuestions
                  ? finalizando
                    ? "Procesando..."
                    : "Finalizar Examen ✓"
                  : "Siguiente →"}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL DE CONFIRMACIÓN IN-DOM */}
      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center">
              {/* Ícono Dinámico según el estado */}
              <div
                className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 border ${
                  errorServidor
                    ? "bg-rose-50 border-rose-100 text-rose-600"
                    : "bg-emerald-50 border-emerald-100 text-emerald-600"
                }`}
              >
                {errorServidor ? (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                {errorServidor
                  ? "Falla en la Entrega"
                  : "¿Confirmás la entrega definitiva?"}
              </h3>

              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                {errorServidor
                  ? "El servidor central rechazó la operación. El intento sigue abierto y protegido, no perdiste tus respuestas."
                  : "Se enviarán todas tus respuestas guardadas al servidor central y se calculará tu calificación inmutable."}
              </p>

              {/* Alerta interna sin romper el foco */}
              {errorServidor && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-left">
                  <span className="block font-mono text-[10px] font-bold text-rose-700 uppercase">
                    Detalle del Backend:
                  </span>
                  <span className="block font-medium text-[11px] text-rose-600 mt-0.5 leading-tight">
                    {errorServidor}
                  </span>
                </div>
              )}

              <div className="flex gap-3 w-full mt-6">
                <Button
                  disabled={finalizando}
                  onClick={() => {
                    setShowConfirmModal(false);
                    setErrorServidor(null);
                  }}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-700 py-2.5 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  {errorServidor ? "Cerrar" : "Seguir revisando"}
                </Button>

                <Button
                  onClick={ejecutarCierreTransaccional}
                  disabled={finalizando}
                  className={`w-full text-white py-2.5 text-xs font-bold rounded-xl shadow-sm transition-all ${
                    errorServidor
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  } disabled:opacity-50`}
                >
                  {finalizando
                    ? "Procesando..."
                    : errorServidor
                      ? "Reintentar Entrega"
                      : "Entregar Examen"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </FullscreenWrapper>
  );
}
