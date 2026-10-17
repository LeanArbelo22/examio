"use client";

import { useMemo, useState } from "react";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import {
  useGuardarPermisoRevision,
  usePermisosRevision,
  useRevocarPermisoRevision,
} from "@/hooks/useRevisiones";
import { getUserErrorMessage } from "@/lib/errors";
import type { AccesoRevision, IntentoCompleto, PermisoRevision } from "@/types";

function toLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function AttemptReviewPermission({ attempt }: { attempt: IntentoCompleto }) {
  const permissionsQuery = usePermisosRevision(attempt.idPublicacion, { idAlumno: attempt.idAlumno });
  const permission = useMemo(
    () => permissionsQuery.data?.find((item) => item.idIntento === attempt.idIntento) ?? null,
    [attempt.idIntento, permissionsQuery.data],
  );
  if (permissionsQuery.isLoading) return <LoadingState message="Cargando permiso de revisión..." />;
  if (permissionsQuery.isError) return <RequestErrorState error={permissionsQuery.error} fallback="No se pudo cargar el permiso de revisión." />;

  return (
    <AttemptReviewPermissionForm
      key={`${permission?.id ?? "new"}:${permission?.revision ?? 0}`}
      attempt={attempt}
      permission={permission}
    />
  );
}

function AttemptReviewPermissionForm({
  attempt,
  permission,
}: {
  attempt: IntentoCompleto;
  permission: PermisoRevision | null;
}) {
  const savePermission = useGuardarPermisoRevision(attempt.idPublicacion, attempt.idIntento);
  const revokePermission = useRevocarPermisoRevision(attempt.idPublicacion, attempt.idIntento);
  const [access, setAccess] = useState<AccesoRevision>(permission?.acceso ?? "libre");
  const [from, setFrom] = useState(toLocalInput(permission?.fechaDesde));
  const [until, setUntil] = useState(toLocalInput(permission?.fechaHasta));
  const [reason, setReason] = useState(permission?.motivo ?? "");

  const invalidDates = Boolean(from && until && new Date(from) >= new Date(until));
  const busy = savePermission.isPending || revokePermission.isPending;

  async function save() {
    await savePermission.mutateAsync({
      Acceso: access,
      FechaDesde: from ? new Date(from).toISOString() : null,
      FechaHasta: until ? new Date(until).toISOString() : null,
      Motivo: reason.trim() || null,
      RevisionEsperada: permission?.revision ?? 0,
    });
  }

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5" aria-labelledby="attempt-review-permission-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="attempt-review-permission-title" className="font-black text-slate-900">Acceso individual a la revisión</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-700">
            Esta autorización se aplica sólo a este intento y prevalece sobre la regla general de la evaluación. La corrección debe estar confirmada.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${permission?.estado === "activo" ? "bg-emerald-100 text-emerald-800" : permission?.estado === "revocado" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
          {permission?.estado === "activo" ? "Autorizado" : permission?.estado === "revocado" ? "Revocado" : "Sin autorización individual"}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-bold text-slate-800">Tipo de acceso
          <select value={access} onChange={(event) => setAccess(event.target.value as AccesoRevision)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">
            <option value="libre">Varias consultas</option>
            <option value="unico">Una consulta por sesión</option>
          </select>
        </label>
        <label className="text-sm font-bold text-slate-800">Desde (opcional)
          <input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
        </label>
        <label className="text-sm font-bold text-slate-800">Hasta (opcional)
          <input type="datetime-local" min={from || undefined} value={until} onChange={(event) => setUntil(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
        </label>
        <label className="text-sm font-bold text-slate-800">Motivo (opcional)
          <input value={reason} maxLength={250} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" placeholder="Ej.: solicitud del alumno" />
        </label>
      </div>
      {invalidDates && <p className="mt-3 text-sm font-semibold text-red-600">La fecha de fin debe ser posterior a la de inicio.</p>}

      {(savePermission.isError || revokePermission.isError) && (
        <div className="mt-4"><FeedbackMessage variant="error" message={getUserErrorMessage(savePermission.error ?? revokePermission.error, "No se pudo actualizar el acceso a la revisión.")} /></div>
      )}
      {(savePermission.isSuccess || revokePermission.isSuccess) && (
        <div className="mt-4"><FeedbackMessage variant="success" message={revokePermission.isSuccess ? "El acceso individual fue revocado." : "El acceso individual fue guardado."} /></div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {permission?.estado === "activo" && (
          <button type="button" onClick={() => void revokePermission.mutateAsync()} disabled={busy} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Revocar acceso</button>
        )}
        <button type="button" onClick={() => void save()} disabled={busy || invalidDates || !attempt.correccionConfirmada} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
          {savePermission.isPending ? "Guardando..." : permission?.estado === "activo" ? "Actualizar autorización" : "Autorizar revisión"}
        </button>
      </div>
      {!attempt.correccionConfirmada && <p className="mt-3 text-right text-xs font-semibold text-amber-700">Confirmá primero la corrección para habilitar cualquier revisión.</p>}
    </section>
  );
}
