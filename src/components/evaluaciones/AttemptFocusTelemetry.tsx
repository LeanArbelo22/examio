"use client";

import { useMemo, useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { useEventosTemporales } from "@/hooks/useTelemetria";
import type { EventoTemporal, TipoEventoTelemetria } from "@/types";

const EVENT_LABELS: Record<Exclude<TipoEventoTelemetria, "exam_resumed" | "question_active">, string> = {
  focus_lost: "Pérdida de foco",
  fullscreen_exit: "Salida de pantalla completa",
  connectivity_lost: "Pérdida de conexión",
  auth_session_unavailable: "Sesión no disponible",
  page_reload: "Página recargada",
  sync_error: "Error de sincronización",
  submission_failed: "Entrega fallida",
  attempt_finished: "Intento finalizado",
};

const NAVIGATION_EVENTS = new Set<TipoEventoTelemetria>([
  "exam_resumed",
  "page_reload",
]);

const numericDuration = (value: number | null): number | null => {
  if (value === null) return null;
  const duration = Number(value);
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
};

const formatDuration = (milliseconds: number | null) => {
  const duration = numericDuration(milliseconds);
  if (duration === null) return "—";
  const seconds = duration / 1000;
  return seconds < 60
    ? `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)} s`
    : `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
};

const deduplicateNavigationEvents = (events: EventoTemporal[]) => {
  const lastTimestampByType = new Map<TipoEventoTelemetria, number>();
  return events.filter((event) => {
    if (!NAVIGATION_EVENTS.has(event.tipo)) return true;
    const timestamp = new Date(event.fechaInicioCliente).getTime();
    const previous = lastTimestampByType.get(event.tipo);
    lastTimestampByType.set(event.tipo, timestamp);
    return previous === undefined || timestamp - previous > 1_000;
  });
};

const eventLabel = (event: EventoTemporal, firstResumeId?: string) => {
  if (event.tipo === "exam_resumed") {
    return event.codigo === "initial_start" || event.eventoId === firstResumeId
      ? "Examen iniciado"
      : "Examen reanudado";
  }
  if (event.tipo === "question_active") return "Pregunta activa";
  return EVENT_LABELS[event.tipo];
};

export function AttemptFocusTelemetry({ idIntento }: { idIntento: number }) {
  const [page, setPage] = useState(1);
  const query = useEventosTemporales(idIntento, page, 100);
  const data = query.data;
  const focusDuration = numericDuration(data?.resumen.duracionesPorTipo.find(
    (item) => item.tipo === "focus_lost",
  )?.duracionMilisegundos ?? 0) ?? 0;
  const questionDuration = data?.resumen.tiemposPorPregunta.reduce(
    (total, item) => total + (numericDuration(item.duracionMilisegundos) ?? 0),
    0,
  ) ?? 0;
  const measuredQuestions = data?.resumen.tiemposPorPregunta.filter(
    (item) => numericDuration(item.duracionMilisegundos) !== null,
  ).length ?? 0;
  const questionCount = data?.resumen.tiemposPorPregunta.length ?? 0;

  const displayedEvents = useMemo(
    () => deduplicateNavigationEvents(
      (data?.items ?? []).filter((event) => event.tipo !== "question_active"),
    ),
    [data?.items],
  );
  const questionEvents = useMemo(
    () => (data?.items ?? []).filter((event) => event.tipo === "question_active"),
    [data?.items],
  );
  const firstResumeId = displayedEvents.find(
    (event) => event.tipo === "exam_resumed",
  )?.eventoId;
  const questionNumberByAttemptQuestion = new Map(
    (data?.resumen.tiemposPorPregunta ?? []).map((item, index) => [
      item.idIntentoPregunta,
      index + 1,
    ]),
  );

  return (
    <section aria-labelledby="attempt-telemetry-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 id="attempt-telemetry-title" className="text-lg font-black text-slate-900">Actividad durante el examen</h2>
        <p className="mt-1 text-sm text-slate-600">
          Resumen informativo de tiempos e interrupciones. Estos datos no modifican por sí solos la nota.
        </p>
      </div>

      {query.isLoading && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3" role="status" aria-label="Cargando actividad del examen">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      )}

      {query.isError && (
        <div className="mt-4">
          <RequestErrorState error={query.error} fallback="No se pudo cargar la actividad del examen." onRetry={() => void query.refetch()} />
        </div>
      )}

      {data && (
        <>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric label="Tiempo en preguntas" value={formatDuration(questionDuration)} />
            <Metric label="Tiempo fuera del examen" value={formatDuration(focusDuration)} />
            <Metric label="Preguntas con tiempo registrado" value={`${measuredQuestions} de ${questionCount}`} />
          </dl>

          {data.resumen.tiemposPorPregunta.length > 0 && (
            <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Ver tiempos por pregunta</summary>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {data.resumen.tiemposPorPregunta.map((item, index) => (
                  <li key={item.idIntentoPregunta} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                    <span className="font-bold">Pregunta {index + 1}</span>
                    <span className="ml-2">{formatDuration(item.duracionMilisegundos)}</span>
                    {item.fuente !== "nueva" && (
                      <span className="ml-2 text-slate-500">
                        {item.fuente === "legacy" ? "dato histórico" : "sin datos"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {displayedEvents.length > 0 ? (
            <EventTable events={displayedEvents} firstResumeId={firstResumeId} />
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">No se registraron interrupciones ni eventos relevantes para mostrar.</p>
          )}

          {questionEvents.length > 0 && (
            <details className="mt-4 rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Más detalles</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[620px] w-full text-left text-xs">
                  <thead className="text-slate-500"><tr><th className="pb-2">Pregunta</th><th className="pb-2">Desde</th><th className="pb-2">Hasta</th><th className="pb-2 text-right">Tiempo</th></tr></thead>
                  <tbody className="divide-y divide-slate-200">
                    {questionEvents.map((event) => (
                      <tr key={event.eventoId}>
                        <td className="py-2 font-semibold text-slate-800">Pregunta {questionNumberByAttemptQuestion.get(event.idIntentoPregunta ?? 0) ?? "—"}</td>
                        <td className="py-2 text-slate-700">{new Date(event.fechaInicioCliente).toLocaleString("es-AR")}</td>
                        <td className="py-2 text-slate-700">{event.fechaFinCliente ? new Date(event.fechaFinCliente).toLocaleString("es-AR") : "Sin cierre"}</td>
                        <td className="py-2 text-right font-semibold text-slate-800">{formatDuration(event.duracionMilisegundos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {data.paginacion.totalPaginas > 1 && (
            <div className="mt-4">
              <Pagination page={data.paginacion.pagina} totalPages={data.paginacion.totalPaginas} total={data.paginacion.total} itemLabel="registros" onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function EventTable({ events, firstResumeId }: { events: EventoTemporal[]; firstResumeId?: string }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-[620px] w-full text-left text-xs">
        <thead className="text-slate-500"><tr><th className="pb-2">Evento</th><th className="pb-2">Momento</th><th className="pb-2 text-right">Duración</th></tr></thead>
        <tbody className="divide-y divide-slate-200">
          {events.map((event) => (
            <tr key={event.eventoId}>
              <td className="py-2 font-semibold text-slate-800">{eventLabel(event, firstResumeId)}</td>
              <td className="py-2 text-slate-700">{new Date(event.fechaInicioCliente).toLocaleString("es-AR")}</td>
              <td className="py-2 text-right font-semibold text-slate-800">{event.esIntervalo ? formatDuration(event.duracionMilisegundos) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-lg font-black text-slate-900">{value}</dd></div>;
}
