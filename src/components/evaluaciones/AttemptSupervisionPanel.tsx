"use client";

import { useState } from "react";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { useDetalleSupervision, useOverrideSupervision } from "@/hooks/useSupervision";
import { getUserErrorMessage } from "@/lib/errors";
import type { AccionOverrideSupervision, AccionSupervision } from "@/types";

const ACTION_LABELS: Record<AccionSupervision, string> = {
  informar: "Sin incidentes relevantes",
  advertir: "Advertencia",
  bloquear_interfaz: "Bloqueo temporal",
  anular_intento: "Intento anulado",
};

export function AttemptSupervisionPanel({ idIntento }: { idIntento: number }) {
  const query = useDetalleSupervision(idIntento);
  const mutation = useOverrideSupervision(idIntento);
  const [reason, setReason] = useState("");

  if (query.isLoading) return <LoadingState message="Cargando supervisión del intento..." />;
  if (query.isError || !query.data) {
    return <RequestErrorState error={query.error} fallback="No se pudo cargar la supervisión del intento." onRetry={() => void query.refetch()} showRetry />;
  }

  const detail = query.data;
  const canModify = detail.estadoSupervision !== "anulado";
  const relevantDecisions = detail.decisiones.filter((decision) => decision.accion !== "informar");
  const apply = async (action: AccionOverrideSupervision, eventId: string | null) => {
    if (!reason.trim()) return;
    await mutation.mutateAsync({
      Accion: action,
      EventoId: eventId,
      Motivo: reason.trim(),
      RevisionEsperada: detail.revisionEstado,
    });
    setReason("");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="attempt-supervision-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="attempt-supervision-title" className="text-lg font-black text-slate-900">Supervisión del intento</h2>
          <p className="mt-1 text-sm text-slate-600">La configuración quedó congelada cuando el alumno inició este intento.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${detail.estadoSupervision === "normal" ? "bg-emerald-100 text-emerald-800" : detail.estadoSupervision === "advertido" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
          {ACTION_LABELS[detail.ultimaAccion]}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Pantalla completa" value={detail.pantallaCompletaObligatoria ? "Obligatoria" : "Opcional"} />
        <Metric label="Incidentes relevantes" value={String(relevantDecisions.length)} />
        <Metric label="Última actualización" value={new Date(detail.fechaActualizacion).toLocaleString("es-AR")} />
      </dl>

      {canModify && (detail.estadoSupervision === "bloqueado" || relevantDecisions.length > 0) && (
        <label className="mt-4 block text-sm font-bold text-slate-800">Motivo de la intervención
          <input value={reason} maxLength={250} onChange={(event) => setReason(event.target.value)} placeholder="Ej.: incidente verificado con el alumno" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" />
        </label>
      )}

      {detail.estadoSupervision === "bloqueado" && canModify && (
        <div className="mt-3 flex justify-end">
          <button type="button" disabled={!reason.trim() || mutation.isPending} onClick={() => void apply("desbloquear", null)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Desbloquear interacción</button>
        </div>
      )}

      {relevantDecisions.length > 0 && (
        <details className="mt-4 rounded-xl border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-800">Ver incidentes y consecuencias</summary>
          <ul className="mt-3 divide-y divide-slate-100">
            {relevantDecisions.map((decision) => (
              <li key={decision.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-bold text-slate-800">{ACTION_LABELS[decision.accion]}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(decision.fechaDecision).toLocaleString("es-AR")}
                    {decision.estadoRevision !== "pendiente" ? " · Revisado" : ""}
                  </p>
                </div>
                {canModify && decision.estadoRevision === "pendiente" && (
                  <div className="flex gap-2">
                    <button type="button" disabled={!reason.trim() || mutation.isPending} onClick={() => void apply("reconocer", decision.eventoId)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Reconocer</button>
                    <button type="button" disabled={!reason.trim() || mutation.isPending} onClick={() => void apply("descartar", decision.eventoId)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Descartar</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {detail.estadoSupervision === "anulado" && <div className="mt-4"><FeedbackMessage variant="warning" message="Este intento fue anulado. Podés consultar y corregir sus respuestas, pero continuará excluido como resultado académico." /></div>}
      {mutation.isError && <div className="mt-4"><FeedbackMessage variant="error" message={getUserErrorMessage(mutation.error, "No se pudo actualizar la supervisión.")} /></div>}
      {mutation.isSuccess && <div className="mt-4"><FeedbackMessage variant="success" message="La intervención quedó registrada." /></div>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-black text-slate-900">{value}</dd></div>;
}
