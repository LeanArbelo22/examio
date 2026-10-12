"use client";

import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { useIncidentesFoco, useResumenIncidentesFoco } from "@/hooks/useTelemetria";

const formatSeconds = (seconds: number) =>
  seconds < 60
    ? `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)} s`
    : `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;

export function AttemptFocusTelemetry({ idIntento }: { idIntento: number }) {
  const summary = useResumenIncidentesFoco(idIntento);
  const incidents = useIncidentesFoco(idIntento);

  return (
    <section aria-labelledby="focus-telemetry-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 id="focus-telemetry-title" className="text-lg font-black text-slate-900">Actividad fuera del examen</h2>
        <p className="mt-1 text-sm text-slate-600">
          Registro informativo de las veces que el alumno salió de la ventana. No modifica automáticamente la nota ni el estado del intento.
        </p>
      </div>

      {(summary.isLoading || incidents.isLoading) && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4" role="status" aria-label="Cargando actividad fuera del examen">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      )}

      {(summary.isError || incidents.isError) && (
        <div className="mt-4">
          <RequestErrorState
            error={summary.error ?? incidents.error}
            fallback="No se pudo cargar la actividad fuera del examen."
            onRetry={() => {
              void summary.refetch();
              void incidents.refetch();
            }}
          />
        </div>
      )}

      {summary.data && incidents.data && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Salidas registradas" value={String(summary.data.cantidadPerdidasFoco)} />
            <Metric label="Tiempo total fuera" value={formatSeconds(summary.data.segundosTotalesFuera)} />
            <Metric label="Tiempo promedio" value={formatSeconds(summary.data.promedioSegundosFuera)} />
            <Metric label="Salida más larga" value={formatSeconds(summary.data.maximoSegundosFuera)} />
          </dl>
          {incidents.data.length > 0 && (
            <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                Ver detalle de {incidents.data.length} {incidents.data.length === 1 ? "salida" : "salidas"}
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[620px] w-full text-left text-xs">
                  <thead className="text-slate-500"><tr><th className="pb-2">Inicio</th><th className="pb-2">Fin</th><th className="pb-2 text-right">Duración</th><th className="pb-2 text-right">Estado</th></tr></thead>
                  <tbody className="divide-y divide-slate-200">
                    {incidents.data.map((incident) => (
                      <tr key={incident.eventoId}>
                        <td className="py-2 text-slate-700">{new Date(incident.fechaInicioCliente).toLocaleString("es-AR")}</td>
                        <td className="py-2 text-slate-700">{incident.fechaFinCliente ? new Date(incident.fechaFinCliente).toLocaleString("es-AR") : "Sin regreso registrado"}</td>
                        <td className="py-2 text-right font-semibold text-slate-800">{incident.duracionMilisegundos === null ? "—" : formatSeconds(incident.duracionMilisegundos / 1000)}</td>
                        <td className="py-2 text-right"><span className="rounded-full bg-slate-200 px-2 py-1 font-semibold text-slate-700">{incident.estado === "completado" ? "Completa" : "Iniciada"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-lg font-black text-slate-900">{value}</dd></div>;
}
