"use client";

import { useState } from "react";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import {
  useActualizarPoliticaRevision,
  useAuditoriaRevision,
  usePoliticaRevision,
} from "@/hooks/useRevisiones";
import { getUserErrorMessage } from "@/lib/errors";
import type { AccesoRevision, ModoRevision, PoliticaRevision } from "@/types";

const modeHelp: Record<ModoRevision, string> = {
  nunca: "Ningún alumno podrá abrir la revisión, aunque la corrección esté confirmada.",
  al_corregir: "El intento válido podrá revisarse después de confirmar su corrección.",
  ventana: "El intento válido podrá revisarse únicamente durante el período indicado.",
  manual: "Sólo podrán revisar los intentos autorizados individualmente.",
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  return value ? new Date(value).toISOString() : null;
}

const auditLabels: Record<string, string> = {
  politica_backfill: "Política inicial creada",
  politica_actualizada: "Política actualizada",
  permiso_otorgado: "Acceso individual otorgado",
  permiso_reactivado: "Acceso individual reactivado",
  permiso_revocado: "Acceso individual revocado",
  sesion_emitida: "Sesión de revisión emitida",
  sesion_reutilizada: "Sesión de revisión reutilizada",
  sesion_abierta: "Revisión abierta",
  sesion_consumida: "Acceso único utilizado",
  sesion_expirada: "Sesión vencida",
  sesion_revocada: "Sesión revocada",
  contenido_consultado: "Contenido consultado",
};

export function ReviewPolicyPanel({ idPublicacion }: { idPublicacion: number }) {
  const policyQuery = usePoliticaRevision(idPublicacion);
  if (policyQuery.isLoading) return <LoadingState message="Cargando política de revisión..." />;
  if (policyQuery.isError || !policyQuery.data) {
    return (
      <RequestErrorState
        error={policyQuery.error}
        fallback="No se pudo cargar la configuración de revisión."
        onRetry={() => void policyQuery.refetch()}
        showRetry
      />
    );
  }

  return (
    <ReviewPolicyEditor
      key={policyQuery.data.revision}
      idPublicacion={idPublicacion}
      policy={policyQuery.data}
      onReload={() => void policyQuery.refetch()}
    />
  );
}

function ReviewPolicyEditor({
  idPublicacion,
  policy,
  onReload,
}: {
  idPublicacion: number;
  policy: PoliticaRevision;
  onReload: () => void;
}) {
  const updatePolicy = useActualizarPoliticaRevision(idPublicacion);
  const [mode, setMode] = useState<ModoRevision>(policy.modo);
  const [access, setAccess] = useState<AccesoRevision>(policy.acceso);
  const [from, setFrom] = useState(toLocalInput(policy.ventanaDesde));
  const [until, setUntil] = useState(toLocalInput(policy.ventanaHasta));
  const [showAudit, setShowAudit] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const auditQuery = useAuditoriaRevision(idPublicacion, { pagina: auditPage, limite: 15 }, showAudit);

  const invalidWindow = mode === "ventana" && (!from || !until || new Date(from) >= new Date(until));

  async function save() {
    await updatePolicy.mutateAsync({
      Modo: mode,
      Acceso: access,
      VentanaDesde: mode === "ventana" ? toIsoOrNull(from) : null,
      VentanaHasta: mode === "ventana" ? toIsoOrNull(until) : null,
      RevisionEsperada: policy.revision,
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="review-policy-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="review-policy-title" className="text-base font-black text-slate-900">Revisión para alumnos</h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Definí cuándo podrán consultar las respuestas y si cada sesión admite una o varias aperturas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAudit((value) => !value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          aria-expanded={showAudit}
        >
          {showAudit ? "Ocultar historial" : "Ver historial"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold text-slate-800">
          Cuándo se permite
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as ModoRevision)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-medium"
          >
            <option value="nunca">No permitir revisiones</option>
            <option value="al_corregir">Al confirmar la corrección</option>
            <option value="ventana">Durante un período</option>
            <option value="manual">Sólo con autorización individual</option>
          </select>
          <span className="mt-2 block text-xs font-normal leading-5 text-slate-600">{modeHelp[mode]}</span>
        </label>

        <label className="text-sm font-bold text-slate-800">
          Tipo de acceso
          <select
            value={access}
            onChange={(event) => setAccess(event.target.value as AccesoRevision)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-medium"
          >
            <option value="libre">Varias consultas durante la disponibilidad</option>
            <option value="unico">Una consulta por sesión emitida</option>
          </select>
          <span className="mt-2 block text-xs font-normal leading-5 text-slate-600">
            Cada sesión dura cinco minutos. El acceso único se consume al abrir el contenido.
          </span>
        </label>
      </div>

      {mode === "ventana" && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold text-slate-800">
            Disponible desde
            <input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="text-sm font-bold text-slate-800">
            Disponible hasta
            <input type="datetime-local" value={until} min={from || undefined} onChange={(event) => setUntil(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
          {invalidWindow && <p className="text-sm font-semibold text-red-600 md:col-span-2">Indicá un período válido; el fin debe ser posterior al inicio.</p>}
        </div>
      )}

      {updatePolicy.isError && (
        <div className="mt-4">
          <FeedbackMessage variant="error" message={getUserErrorMessage(updatePolicy.error, "No se pudo guardar la política de revisión.")} />
          <button type="button" onClick={onReload} className="mt-2 text-xs font-bold text-indigo-700 underline">Recargar configuración</button>
        </div>
      )}
      {updatePolicy.isSuccess && <div className="mt-4"><FeedbackMessage variant="success" message="La configuración de revisión se guardó correctamente." /></div>}

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={() => void save()} disabled={invalidWindow || updatePolicy.isPending} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
          {updatePolicy.isPending ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>

      {showAudit && (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <h4 className="text-sm font-black text-slate-900">Historial de cambios y accesos</h4>
          {auditQuery.isLoading && <LoadingState message="Cargando historial..." />}
          {auditQuery.isError && <RequestErrorState error={auditQuery.error} fallback="No se pudo cargar el historial." />}
          {auditQuery.data?.items.length === 0 && <p className="mt-3 text-sm text-slate-500">Todavía no hay movimientos registrados.</p>}
          <ul className="mt-3 divide-y divide-slate-100">
            {auditQuery.data?.items.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <span className="font-semibold text-slate-700">{auditLabels[item.accion] ?? item.accion}</span>
                <span className="text-xs text-slate-500">{new Date(item.fecha).toLocaleString("es-AR")}</span>
              </li>
            ))}
          </ul>
          {auditQuery.data && auditQuery.data.pagination.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                page={auditQuery.data.pagination.page}
                totalPages={auditQuery.data.pagination.totalPages}
                total={auditQuery.data.pagination.total}
                itemLabel="movimientos"
                onPageChange={setAuditPage}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
