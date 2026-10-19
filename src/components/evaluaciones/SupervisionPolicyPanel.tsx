"use client";

import { useState } from "react";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { useActualizarPoliticaSupervision, usePoliticaSupervision } from "@/hooks/useSupervision";
import { getUserErrorMessage } from "@/lib/errors";
import type {
  AccionSupervision,
  MetricaSupervision,
  PoliticaSupervision,
  ReglaSupervision,
  TipoEventoTelemetria,
} from "@/types";

const EVENT_OPTIONS: Array<{ value: TipoEventoTelemetria; label: string }> = [
  { value: "focus_lost", label: "Salir de la pestaña o ventana" },
  { value: "fullscreen_exit", label: "Salir de pantalla completa" },
  { value: "connectivity_lost", label: "Perder la conexión" },
  { value: "auth_session_unavailable", label: "Perder la sesión de usuario" },
  { value: "sync_error", label: "Error al guardar información" },
  { value: "submission_failed", label: "Falla al entregar el examen" },
];

const METRIC_OPTIONS: Array<{ value: MetricaSupervision; label: string }> = [
  { value: "cantidad", label: "Cantidad de veces" },
  { value: "duracion_individual", label: "Duración de un incidente" },
  { value: "duracion_acumulada", label: "Tiempo acumulado" },
];

const DURATION_EVENT_TYPES = new Set<TipoEventoTelemetria>([
  "focus_lost",
  "fullscreen_exit",
  "connectivity_lost",
  "auth_session_unavailable",
]);

const ACTION_OPTIONS: Array<{ value: AccionSupervision; label: string }> = [
  { value: "informar", label: "Sólo registrar" },
  { value: "advertir", label: "Advertir al alumno" },
  { value: "bloquear_interfaz", label: "Bloquear hasta que se recupere" },
  { value: "anular_intento", label: "Anular el intento" },
];

const newRule = (index: number): ReglaSupervision => ({
  codigo: `regla-${Date.now().toString(36)}-${index}`,
  tipoEvento: "focus_lost",
  metrica: "cantidad",
  umbral: 1,
  ventanaSegundos: null,
  prioridad: 10,
  accion: "advertir",
  activa: true,
});

export function SupervisionPolicyPanel({ idPublicacion }: { idPublicacion: number }) {
  const query = usePoliticaSupervision(idPublicacion);
  if (query.isLoading) return <LoadingState message="Cargando condiciones de supervisión..." />;
  if (query.isError || !query.data) {
    return <RequestErrorState error={query.error} fallback="No se pudo cargar la supervisión del examen." onRetry={() => void query.refetch()} showRetry />;
  }
  return <SupervisionPolicyEditor key={query.data.revision} idPublicacion={idPublicacion} policy={query.data} />;
}

function SupervisionPolicyEditor({ idPublicacion, policy }: { idPublicacion: number; policy: PoliticaSupervision }) {
  const mutation = useActualizarPoliticaSupervision(idPublicacion);
  const [fullscreenRequired, setFullscreenRequired] = useState(policy.pantallaCompletaObligatoria);
  const [rules, setRules] = useState(policy.reglas);

  const updateRule = (index: number, changes: Partial<ReglaSupervision>) => {
    setRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...changes } : rule));
  };
  const invalid = rules.some((rule) => !rule.codigo.trim() || rule.umbral <= 0 || rule.prioridad < 0);

  async function save() {
    await mutation.mutateAsync({
      PantallaCompletaObligatoria: fullscreenRequired,
      RevisionEsperada: policy.revision,
      Reglas: rules.map((rule) => ({
        Codigo: rule.codigo,
        TipoEvento: rule.tipoEvento,
        Metrica: rule.metrica,
        Umbral: Math.round(rule.umbral),
        VentanaSegundos: rule.ventanaSegundos,
        Prioridad: rule.prioridad,
        Accion: rule.accion,
        Activa: rule.activa,
      })),
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="supervision-policy-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="supervision-policy-title" className="text-base font-black text-slate-900">Supervisión durante el examen</h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">Definí qué debe ocurrir ante interrupciones. Los cambios se aplican solamente a intentos que comiencen después de guardar.</p>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-800">
          <input type="checkbox" checked={fullscreenRequired} onChange={(event) => setFullscreenRequired(event.target.checked)} className="h-4 w-4 accent-indigo-600" />
          Exigir pantalla completa
        </label>
      </div>

      <div className="mt-5 space-y-4">
        {rules.map((rule, index) => {
          const isDuration = rule.metrica !== "cantidad";
          const supportsDuration = DURATION_EVENT_TYPES.has(rule.tipoEvento);
          return (
            <fieldset key={`${rule.id ?? rule.codigo}:${index}`} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <legend className="px-2 text-sm font-black text-slate-800">Regla {index + 1}</legend>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-xs font-bold text-slate-700">Cuando ocurra
                  <select
                    value={rule.tipoEvento}
                    onChange={(event) => {
                      const tipoEvento = event.target.value as TipoEventoTelemetria;
                      updateRule(index, {
                        tipoEvento,
                        ...(!DURATION_EVENT_TYPES.has(tipoEvento) && rule.metrica !== "cantidad"
                          ? { metrica: "cantidad" as const, umbral: 1 }
                          : {}),
                      });
                    }}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {EVENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">Medir por
                  <select value={rule.metrica} onChange={(event) => updateRule(index, { metrica: event.target.value as MetricaSupervision, umbral: 1 })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    {METRIC_OPTIONS.filter((option) => supportsDuration || option.value === "cantidad").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">{isDuration ? "A partir de (segundos)" : "A partir de"}
                  <input type="number" min="1" step="1" value={isDuration ? rule.umbral / 1000 : rule.umbral} onChange={(event) => updateRule(index, { umbral: Number(event.target.value) * (isDuration ? 1000 : 1) })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                </label>
                <label className="text-xs font-bold text-slate-700">Consecuencia
                  <select value={rule.accion} onChange={(event) => updateRule(index, { accion: event.target.value as AccionSupervision })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    {ACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <label className="text-xs font-bold text-slate-700">Considerar sólo los últimos minutos (opcional)
                  <input type="number" min="1" step="1" value={rule.ventanaSegundos ? rule.ventanaSegundos / 60 : ""} onChange={(event) => updateRule(index, { ventanaSegundos: event.target.value ? Math.round(Number(event.target.value) * 60) : null })} className="mt-1.5 block w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={rule.activa} onChange={(event) => updateRule(index, { activa: event.target.checked })} className="accent-indigo-600" /> Regla activa</label>
                  <button type="button" onClick={() => setRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index))} className="text-xs font-bold text-red-700 underline underline-offset-2">Eliminar regla</button>
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>

      <button type="button" onClick={() => setRules((current) => [...current, newRule(current.length + 1)])} className="mt-4 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50">+ Agregar regla</button>
      {rules.length === 0 && <p className="mt-3 text-sm text-slate-600">Sin reglas activas, los eventos se registrarán pero no producirán advertencias, bloqueos ni anulaciones.</p>}
      {mutation.isError && <div className="mt-4"><FeedbackMessage variant="error" message={getUserErrorMessage(mutation.error, "No se pudo guardar la supervisión.")} /></div>}
      {mutation.isSuccess && <div className="mt-4"><FeedbackMessage variant="success" message="La configuración de supervisión se guardó correctamente." /></div>}
      <div className="mt-5 flex justify-end"><button type="button" disabled={invalid || mutation.isPending} onClick={() => void save()} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{mutation.isPending ? "Guardando..." : "Guardar supervisión"}</button></div>
    </section>
  );
}
