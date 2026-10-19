"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { StudentReviewContent } from "@/components/evaluaciones/StudentReviewContent";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import { useContenidoRevision, useDisponibilidadRevision, useEmitirSesionRevision } from "@/hooks/useRevisiones";
import { getUserErrorMessage } from "@/lib/errors";
import type { SesionRevision } from "@/types";

const reasonMessages: Record<string, string> = {
  ATTEMPT_NOT_DELIVERED: "El intento todavía no fue entregado.",
  CORRECTION_NOT_CONFIRMED: "El docente todavía no confirmó la corrección.",
  INDIVIDUAL_PERMISSION_REVOKED: "El acceso individual a esta revisión fue revocado.",
  NOT_CURRENT_VALID_ATTEMPT: "La revisión general sólo está disponible para el intento válido actual.",
  POLICY_NEVER: "El docente configuró esta evaluación sin revisión posterior.",
  POLICY_MANUAL: "Esta evaluación requiere una autorización individual del docente.",
  POLICY_WINDOW_NOT_STARTED: "El período de revisión todavía no comenzó.",
  POLICY_WINDOW_EXPIRED: "El período de revisión ya finalizó.",
  UNIQUE_ACCESS_CONSUMED: "Ya utilizaste la única revisión habilitada para este intento.",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function RevisionAlumnoPage({ params }: { params: Promise<{ idIntento: string }> }) {
  const { idIntento } = use(params);
  const attemptId = Number(idIntento);
  const availability = useDisponibilidadRevision(attemptId);
  const refetchAvailability = availability.refetch;
  const issueSession = useEmitirSesionRevision(attemptId);
  const idempotency = useIdempotencyKey();
  const [session, setSession] = useState<SesionRevision | null>(null);
  const [expired, setExpired] = useState(false);
  const content = useContenidoRevision(session?.idSesion ?? null);

  useEffect(() => {
    if (!session) return;

    const expirationTime = new Date(session.fechaExpiracion).getTime();
    const expireIfNeeded = () => {
      if (Date.now() < expirationTime) return;
      setExpired(true);
      void refetchAvailability();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") expireIfNeeded();
    };
    const timeoutId = window.setTimeout(expireIfNeeded, Math.max(0, expirationTime - Date.now()));

    window.addEventListener("focus", expireIfNeeded);
    window.addEventListener("pageshow", expireIfNeeded);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", expireIfNeeded);
      window.removeEventListener("pageshow", expireIfNeeded);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refetchAvailability, session]);

  async function openReview() {
    const key = idempotency.keyFor({ idIntento: attemptId });
    try {
      const session = await issueSession.mutateAsync(key);
      setSession(session);
      setExpired(false);
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
  if (expired && session) {
    const canOpenAgain = session.acceso === "libre" && availability.data.revisionDisponible;
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-black text-amber-950">El tiempo de revisión terminó</h1>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          {canOpenAgain
            ? "Si la revisión continúa habilitada, podés volver a abrirla para consultarla nuevamente."
            : "Esta revisión podía abrirse una sola vez y ya no puede volver a mostrarse."}
        </p>
        {(issueSession.isError || content.isError) && (
          <div className="mt-4"><FeedbackMessage variant="error" message={getUserErrorMessage(issueSession.error ?? content.error, "No se pudo volver a abrir la revisión.")} /></div>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Link href="/alumno/resultados" className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-950">Volver al historial</Link>
          {canOpenAgain && (
            <button type="button" onClick={() => void openReview()} disabled={issueSession.isPending} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {issueSession.isPending ? "Abriendo..." : "Volver a abrir la revisión"}
            </button>
          )}
        </div>
      </section>
    );
  }
  if (content.data && session) {
    return (
      <div className="space-y-4">
        <FeedbackMessage
          variant="info"
          message={`Podés consultar esta revisión hasta ${formatDateTime(session.fechaExpiracion)}.`}
        />
        <StudentReviewContent data={content.data.contenido} />
      </div>
    );
  }

  const availableMinutes = Math.max(1, Math.ceil(availability.data.duracionSesionSegundos / 60));

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Revisión disponible</p>
      <h1 className="mt-2 text-2xl font-black text-slate-900">Abrir revisión del examen</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Al abrirla tendrás hasta {availableMinutes} {availableMinutes === 1 ? "minuto" : "minutos"} para consultar las respuestas, correcciones y devoluciones.
        {availability.data.disponibleHasta && " Si el período habilitado termina antes, la revisión se cerrará en ese momento."}
      </p>
      {(availability.data.disponibleDesde || availability.data.disponibleHasta) && (
        <p className="mt-2 text-xs font-semibold text-slate-500">
          {availability.data.disponibleDesde && `Disponible desde ${formatDateTime(availability.data.disponibleDesde)}`}
          {availability.data.disponibleDesde && availability.data.disponibleHasta && " · "}
          {availability.data.disponibleHasta && `Disponible hasta ${formatDateTime(availability.data.disponibleHasta)}`}
        </p>
      )}
      {availability.data.acceso === "unico" && (
        <div className="mt-4"><FeedbackMessage variant="warning" message="Podés abrir esta revisión una sola vez. El acceso se considera utilizado cuando se muestra el contenido; abrila cuando estés listo." /></div>
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
