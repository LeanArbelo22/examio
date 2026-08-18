"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  useRegistrarAlerta,
  useFinalizarExamen,
} from "@/hooks/useEvaluaciones";

interface FullscreenWrapperProps {
  children: React.ReactNode;
  idIntento: number; // <-- Inyectamos el ID transaccional del intento actual
}

type ExamDocument = Document & { isExitingLegitimately?: boolean };

export function FullscreenWrapper({
  children,
  idIntento,
}: FullscreenWrapperProps) {
  const router = useRouter();
  const resumeMarker = `examio_exam_entered_${idIntento}`;
  const [isResuming] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem(resumeMarker) === "true",
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Invocamos los hooks analíticos reales
  const { mutate: enviarAlerta } = useRegistrarAlerta();
  const { mutate: forzarCierreExamen } = useFinalizarExamen();
  const isFinalizingRef = useRef(false);

  // Función centralizada para ejecutar la penalización antifraude de EXAMIO
  const triggerFraudePenalty = useCallback(
    async (tipoIncidente: string, detalle: string) => {
      if (isFinalizingRef.current) return;
      isFinalizingRef.current = true;

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          console.error("Error al intentar salir de fullscreen:", err);
        }
      }

      setIsFullscreen(false);
      setShowWarningModal(true);

      // 1. Impacta el incidente en la tabla AlertaFraude en SQL Server
      enviarAlerta({
        IdIntento: idIntento,
        TipoIncidente: tipoIncidente,
        Detalle: detalle,
      });

      // 2. Ejecuta SP_Intento_FinalizarExamen poniendo el estado en 'anulado' o 'entregado' bajo revisión
      forzarCierreExamen(idIntento);
    },
    [enviarAlerta, forzarCierreExamen, idIntento],
  );

  // Detectar salida manual de pantalla completa (Tecla ESC)
  useEffect(() => {
    // Listener de cambio de pantalla completa
    const handleFullscreenChange = () => {
      const doc = document as ExamDocument;
      if (doc.isExitingLegitimately) return; // ESCUDO ACTIVO

      if (!document.fullscreenElement && isFullscreen) {
        triggerFraudePenalty(
          "fullscreen_exit",
          "El alumno forzó la salida de la pantalla completa.",
        );
      }
    };

    // Listener de pérdida de foco (Cambiar de pestaña o abrir otra app)
    const handleWindowBlur = () => {
      const doc = document as ExamDocument;
      if (doc.isExitingLegitimately) return; // ESCUDO ACTIVO

      triggerFraudePenalty(
        "focus_lost",
        "El alumno cambió de pestaña o minimizó el navegador protegido.",
      );
    };

    // Listener de cambio de visibilidad
    const handleVisibilityChange = () => {
      const doc = document as ExamDocument;
      if (doc.isExitingLegitimately) return; // ESCUDO ACTIVO

      if (document.visibilityState === "hidden") {
        triggerFraudePenalty(
          "focus_lost",
          "El alumno ocultó la ventana del examen.",
        );
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isFullscreen, triggerFraudePenalty]);

  // Bloqueo estricto de Portapapeles e Inspección de código
  useEffect(() => {
    if (!isFullscreen) return;

    const blockClipboard = (e: Event) => {
      e.preventDefault();
      // Logueamos de forma silenciosa a la DB el intento de copia/pega sin congelar la pantalla
      enviarAlerta({
        IdIntento: idIntento,
        TipoIncidente: "clipboard_block",
        Detalle:
          "Intento de interacción con el portapapeles (Copy/Cut/Paste) bloqueado.",
      });
    };

    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      enviarAlerta({
        IdIntento: idIntento,
        TipoIncidente: "context_menu_block",
        Detalle: "Intento de abrir el menú contextual durante el examen.",
      });
    };

    const blockShortcuts = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === "I" || e.key === "J")) ||
        ((e.ctrlKey || e.metaKey) && e.key === "u")
      ) {
        e.preventDefault();
        enviarAlerta({
          IdIntento: idIntento,
          TipoIncidente: "inspector_block",
          Detalle:
            "Intento de apertura de las herramientas de desarrollador (F12/Inspect) bloqueado.",
        });
      }
    };

    document.addEventListener("copy", blockClipboard);
    document.addEventListener("cut", blockClipboard);
    document.addEventListener("paste", blockClipboard);
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockShortcuts);

    return () => {
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("paste", blockClipboard);
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockShortcuts);
    };
  }, [enviarAlerta, idIntento, isFullscreen]);

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      sessionStorage.setItem(resumeMarker, "true");
      setIsFullscreen(true);
      setShowFullscreenPrompt(false);
    } catch (err) {
      alert("Debes permitir pantalla completa para continuar: " + err);
    }
  };

  const handleExitRedirect = () => {
    setShowWarningModal(false);
    router.replace("/alumno");
  };

  return (
    <>
      {showFullscreenPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xl p-7 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 mb-4">
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
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {isResuming
                  ? "Reanudar evaluación"
                  : "Bloqueo de Seguridad Activo"}
              </h2>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                {isResuming
                  ? "Restauramos tus preguntas y respuestas guardadas. El temporizador continúa desde el plazo original."
                  : "Para garantizar la validez de tu examen, la plataforma iniciará el entorno controlado institucional."}
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left mt-5 space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                  <span className="text-emerald-500 text-sm select-none leading-none">
                    ✓
                  </span>
                  <span>Se forzará el modo pantalla completa obligatoria.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                  <span className="text-emerald-500 text-sm select-none leading-none">
                    ✓
                  </span>
                  <span>
                    Cambiar de pestaña o minimizar enviará y congelará el examen
                    de inmediato.
                  </span>
                </div>
              </div>
              <div className="mt-6">
                <Button
                  onClick={requestFullscreen}
                  className="w-full bg-indigo-600 text-white py-3 px-4 text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-sm transition-all"
                >
                  {isResuming ? "Continuar examen" : "Confirmar e Ingresar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-red-100 rounded-2xl shadow-2xl p-7 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-50 border border-red-100 text-red-600 mb-4">
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
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Evaluación Interrumpida
              </h2>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Detectamos una salida del entorno seguro o pérdida de foco. Por
                normativas antifraude, tus respuestas han sido congeladas y
                enviadas para revisión.
              </p>
              <div className="mt-6">
                <Button
                  onClick={handleExitRedirect}
                  className="w-full bg-red-600 text-white py-3 px-4 text-sm font-bold rounded-xl hover:bg-red-700 shadow-sm transition-all"
                >
                  Entendido, salir
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={
          isFullscreen ? "fixed inset-0 bg-slate-50 z-30 overflow-y-auto" : ""
        }
      >
        {children}
      </div>
    </>
  );
}
