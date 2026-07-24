"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "../ui/Button";
import type { SessionAuthError } from "@/types/auth";

const RETRYABLE_ERRORS = new Set<SessionAuthError>([
  "AUTH_INFRASTRUCTURE_ERROR",
  "RATE_LIMITED",
]);

export function SessionExpiredModal() {
  const pathname = usePathname();
  const { data: session, update } = useSession();
  const [isRetrying, setIsRetrying] = useState(false);
  const [eventProblem, setEventProblem] = useState<{
    code: SessionAuthError;
    examScope?: string;
  }>();
  const [dismissedExamScope, setDismissedExamScope] = useState<string>();
  const examScope = pathname.match(/^\/alumno\/examen\/[^/]+/)?.[0];
  const isExamRoute = Boolean(examScope);
  const sessionError =
    examScope && dismissedExamScope === examScope
      ? undefined
      : session?.authError;
  const eventError =
    eventProblem &&
    eventProblem.examScope === examScope &&
    (!examScope || dismissedExamScope !== examScope)
      ? eventProblem.code
      : undefined;
  const errorCode = eventError ?? sessionError;
  const isOpen = Boolean(errorCode);

  useEffect(() => {
    const handleSessionProblem = (event: Event) => {
      if (examScope && dismissedExamScope === examScope) return;
      const customEvent = event as CustomEvent<{ code?: SessionAuthError }>;
      setEventProblem({
        code: customEvent.detail?.code ?? "AUTH_INFRASTRUCTURE_ERROR",
        examScope,
      });
    };
    window.addEventListener("EXAMIO_SESSION_PROBLEM", handleSessionProblem);
    return () => {
      window.removeEventListener("EXAMIO_SESSION_PROBLEM", handleSessionProblem);
    };
  }, [dismissedExamScope, examScope]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const refreshedSession = await update();
      if (!refreshedSession?.authError) {
        setEventProblem(undefined);
        setDismissedExamScope(undefined);
      } else {
        setEventProblem({
          code: refreshedSession.authError,
          examScope,
        });
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleLogout = async () => {
    setEventProblem(undefined);
    await signOut({ callbackUrl: "/login" });
  };

  const handleContinueExam = () => {
    setEventProblem(undefined);
    setDismissedExamScope(examScope);
  };

  if (!isOpen) return null;

  const canRetry = Boolean(errorCode && RETRYABLE_ERRORS.has(errorCode));

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-problem-title"
        className="relative bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] max-w-md w-full mx-auto"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-amber-50 border border-amber-100 mb-4 text-amber-600">
            <span aria-hidden="true" className="text-xl">!</span>
          </div>

          <h2 id="session-problem-title" className="text-xl font-bold text-slate-900 tracking-tight">
            {isExamRoute
              ? "No pudimos sincronizar tu sesión"
              : "Tu sesión necesita atención"}
          </h2>

          <p className="mt-2 text-sm text-slate-500 leading-relaxed mb-6">
            {isExamRoute
              ? "El examen permanece abierto y el temporizador continúa. No cierres ni recargues esta pestaña; verificá el estado de guardado antes de entregar."
              : "Volvé a iniciar sesión para continuar trabajando de forma segura."}
          </p>

          <div className="flex gap-3 w-full">
            {isExamRoute ? (
              <>
                <Button
                  onClick={handleContinueExam}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-700 py-2.5 px-4 text-sm font-semibold rounded-xl hover:bg-slate-200"
                >
                  Continuar en el examen
                </Button>
                {canRetry && (
                  <Button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="w-full bg-indigo-600 text-white py-2.5 px-4 text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isRetrying ? "Reintentando..." : "Reintentar sesión"}
                  </Button>
                )}
              </>
            ) : (
              <Button
                onClick={handleLogout}
                className="w-full bg-indigo-600 text-white py-2.5 px-4 text-sm font-semibold rounded-xl hover:bg-indigo-700"
              >
                Volver a iniciar sesión
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
