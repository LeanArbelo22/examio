"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useRegistrarAlerta } from "@/hooks/useEvaluaciones";
import type { EstadoSupervisionIntento } from "@/types";

interface FullscreenWrapperProps {
  children: React.ReactNode;
  idIntento: number;
  supervision: EstadoSupervisionIntento;
  warningDecisionId: number | null;
  telemetryDurable: boolean;
  onFullscreenViolation: () => void;
  onFullscreenRestored: () => void;
}

type ExamDocument = Document & { isExitingLegitimately?: boolean };

export function FullscreenWrapper({ children, idIntento, supervision, warningDecisionId, telemetryDurable, onFullscreenViolation, onFullscreenRestored }: FullscreenWrapperProps) {
  const router = useRouter();
  const resumeMarker = `examio_exam_entered_${idIntento}`;
  const [isResuming] = useState(() => typeof window !== "undefined" && sessionStorage.getItem(resumeMarker) === "true");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(isResuming);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(supervision.pantallaCompletaObligatoria);
  const [dismissedWarningDecisionId, setDismissedWarningDecisionId] = useState<number | null>(null);
  const { mutate: enviarAlerta } = useRegistrarAlerta();
  const requestingFullscreen = useRef(false);

  const requestFullscreen = useCallback(async () => {
    try {
      requestingFullscreen.current = true;
      (document as ExamDocument).isExitingLegitimately = false;
      await document.documentElement.requestFullscreen();
      sessionStorage.setItem(resumeMarker, "true");
      setIsFullscreen(true);
      setHasEnteredFullscreen(true);
      setShowFullscreenPrompt(false);
      onFullscreenRestored();
    } catch (error) {
      alert(`Debes permitir pantalla completa para continuar: ${String(error)}`);
    } finally {
      requestingFullscreen.current = false;
    }
  }, [onFullscreenRestored, resumeMarker]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as ExamDocument;
      if (document.fullscreenElement) {
        setIsFullscreen(true);
        setShowFullscreenPrompt(false);
        if (!requestingFullscreen.current) onFullscreenRestored();
        return;
      }
      setIsFullscreen(false);
      if (doc.isExitingLegitimately) return;
      if (supervision.pantallaCompletaObligatoria) {
        setShowFullscreenPrompt(true);
        onFullscreenViolation();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [onFullscreenRestored, onFullscreenViolation, supervision.pantallaCompletaObligatoria]);

  useEffect(() => {
    if (!isFullscreen) return;
    const report = (tipo: string, detalle: string) => enviarAlerta({ IdIntento: idIntento, TipoIncidente: tipo, Detalle: detalle });
    const blockClipboard = (event: Event) => { event.preventDefault(); report("clipboard_block", "Intento de interacción con el portapapeles bloqueado."); };
    const blockContextMenu = (event: MouseEvent) => { event.preventDefault(); report("context_menu_block", "Intento de abrir el menú contextual durante el examen."); };
    const blockShortcuts = (event: KeyboardEvent) => {
      const blocked = event.key === "F12"
        || ((event.ctrlKey || event.metaKey) && event.shiftKey && ["I", "J"].includes(event.key))
        || ((event.ctrlKey || event.metaKey) && event.key === "u");
      if (!blocked) return;
      event.preventDefault();
      report("inspector_block", "Intento de abrir herramientas de desarrollo bloqueado.");
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

  const isCancelled = supervision.intentoAnulado;
  const isBlocked = supervision.interaccionBloqueada && !isCancelled;
  const showWarning = warningDecisionId !== null
    && dismissedWarningDecisionId !== warningDecisionId;
  const requiresFullscreenPrompt = supervision.pantallaCompletaObligatoria
    && (showFullscreenPrompt || !isFullscreen);
  const fullscreenPromptTitle = supervision.accion === "advertir"
    ? "Se registró una salida de pantalla completa"
    : hasEnteredFullscreen
      ? "Volvé a pantalla completa"
      : isResuming
      ? "Reanudar evaluación"
      : "Pantalla completa requerida";
  const fullscreenPromptDescription = supervision.accion === "advertir"
    ? "El incidente quedó registrado. Volvé a pantalla completa para continuar con el examen."
    : hasEnteredFullscreen
      ? "La salida se está registrando. Volvé al entorno del examen mientras la plataforma verifica la consecuencia configurada."
      : "Esta evaluación requiere pantalla completa. Las salidas se registran y la plataforma aplica la consecuencia configurada por el docente.";

  return (
    <>
      {requiresFullscreenPrompt && !isCancelled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xl">
            <h2 className="text-center text-xl font-bold text-slate-900">{fullscreenPromptTitle}</h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">{fullscreenPromptDescription}</p>
            <Button onClick={requestFullscreen} className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700">{hasEnteredFullscreen ? "Volver a pantalla completa" : "Ingresar al examen"}</Button>
          </div>
        </div>
      )}

      {showWarning && !requiresFullscreenPrompt && !isBlocked && !isCancelled && (
        <div role="alert" className="fixed left-1/2 top-4 z-[60] w-[min(92vw,40rem)] -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg">
          <p className="font-bold">Se registró una interrupción durante el examen</p>
          <p className="mt-1">Podés continuar, pero el evento quedará disponible para el docente.</p>
          <button type="button" onClick={() => setDismissedWarningDecisionId(warningDecisionId)} className="mt-2 font-bold underline underline-offset-2">Entendido</button>
        </div>
      )}

      {(isBlocked || isCancelled) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-7 text-center shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">{isCancelled ? "Intento anulado" : "Interacción temporalmente bloqueada"}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {isCancelled
                ? "La política de supervisión anuló el intento. Las respuestas sincronizadas se conservaron para consulta institucional."
                : "La plataforma registró un incidente. Tus respuestas siguen protegidas y pueden continuar sincronizándose mientras se valida la recuperación."}
            </p>
            {!telemetryDurable && !isCancelled && <p className="mt-3 text-xs font-semibold text-amber-700">Mantené esta pantalla abierta mientras se sincroniza el incidente.</p>}
            {isCancelled ? (
              <Button onClick={() => router.replace("/alumno")} className="mt-6 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700">Salir</Button>
            ) : supervision.pantallaCompletaObligatoria && !isFullscreen ? (
              <Button onClick={requestFullscreen} className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700">Volver a pantalla completa</Button>
            ) : (
              <p className="mt-5 text-xs font-semibold text-slate-500" role="status">Esperando confirmación de recuperación…</p>
            )}
          </div>
        </div>
      )}

      <div className={isFullscreen ? "fixed inset-0 z-30 overflow-y-auto bg-slate-50" : ""}>{children}</div>
    </>
  );
}
