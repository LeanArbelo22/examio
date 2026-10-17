"use client";

import { use, useState } from "react";
import Link from "next/link";
import { StudentReviewContent } from "@/components/evaluaciones/StudentReviewContent";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import { useContenidoRevision, useDisponibilidadRevision, useEmitirSesionRevision } from "@/hooks/useRevisiones";
import { getUserErrorMessage } from "@/lib/errors";

const reasonMessages: Record<string, string> = {
  ATTEMPT_NOT_DELIVERED: "El intento todavía no fue entregado.",
  CORRECTION_NOT_CONFIRMED: "El docente todavía no confirmó la corrección.",
  INDIVIDUAL_PERMISSION_REVOKED: "El acceso individual a esta revisión fue revocado.",
  NOT_CURRENT_VALID_ATTEMPT: "La revisión general sólo está disponible para el intento válido actual.",
  POLICY_NEVER: "El docente configuró esta evaluación sin revisión posterior.",
  POLICY_MANUAL: "Esta evaluación requiere una autorización individual del docente.",
  POLICY_WINDOW_NOT_STARTED: "El período de revisión todavía no comenzó.",
  POLICY_WINDOW_EXPIRED: "El período de revisión ya finalizó.",
};

export default function RevisionAlumnoPage({ params }: { params: Promise<{ idIntento: string }> }) {
  const { idIntento } = use(params);
  const attemptId = Number(idIntento);
  const availability = useDisponibilidadRevision(attemptId);
  const issueSession = useEmitirSesionRevision(attemptId);
  const idempotency = useIdempotencyKey();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const content = useContenidoRevision(sessionId);

  async function openReview() {
    const key = idempotency.keyFor({ idIntento: attemptId });
    try {
      const session = await issueSession.mutateAsync(key);
      setSessionId(session.idSesion);
      idempotency.complete();
    } catch {
      // Un reintento incierto conserva la misma clave y la misma intención.
    }
  }

  if (!Number.isInteger(attemptId) || attemptId <= 0) {
    return <FeedbackMessage variant="error" message="El identificador del intento no es válido." />;
  }
  if (availability.isLoading) return <LoadingState message="Consultando disponibilidad de la revisión..." />;
  if (availability.isError) {
    return <RequestErrorState error={availability.error} fallback="No se pudo consultar la revisión." onRetry={() => void availability.refetch()} showRetry />;
  }
  if (!availability.data?.revisionDisponible) {
    const reason = availability.data?.motivo;
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-black text-amber-950">Revisión no disponible</h1>
        <p className="mt-2 text-sm text-amber-900">{reason ? reasonMessages[reason] ?? "La revisión no está habilitada en este momento." : "La revisión no está habilitada en este momento."}</p>
        <Link href="/alumno/resultados" className="mt-5 inline-block rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Volver al historial</Link>
      </section>
    );
  }
  if (content.data) return <StudentReviewContent data={content.data.contenido} />;

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Revisión disponible</p>
      <h1 className="mt-2 text-2xl font-black text-slate-900">Abrir revisión del examen</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Al abrirla tendrás cinco minutos para consultar las respuestas, correcciones y devoluciones.</p>
      {availability.data.acceso === "unico" && (
        <div className="mt-4"><FeedbackMessage variant="warning" message="Este acceso es único: la sesión se consume al mostrar el contenido. Abrila cuando estés listo para revisarla." /></div>
      )}
      {(issueSession.isError || content.isError) && (
        <div className="mt-4"><FeedbackMessage variant="error" message={getUserErrorMessage(issueSession.error ?? content.error, "No se pudo abrir la revisión.")} /></div>
      )}
      {(issueSession.isPending || content.isLoading) && <div className="mt-4"><LoadingState message="Preparando revisión segura..." /></div>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Link href="/alumno/resultados" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Cancelar</Link>
        <button type="button" onClick={() => void openReview()} disabled={issueSession.isPending || content.isLoading} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">Abrir revisión</button>
      </div>
    </section>
  );
}
