"use client";

import { chartColors } from "@/lib/chart-tokens";
import { useReporteOpcionesPregunta, useReporteRendimientoGrupos, useResultadosVariantes } from "@/hooks/useReportes";
import type {
  ReporteOpcionesFiltros,
  ReportePreguntaItem,
} from "@/types";
import { Modal } from "@/components/ui/Modal";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { ApiError } from "@/lib/api";

interface QuestionOptionsDetailProps {
  question: ReportePreguntaItem | null;
  filters: ReporteOpcionesFiltros;
  onClose: () => void;
}

const CLOSED_TYPES = new Set(["mc", "multiple", "vf"]);

function percentage(value: number | null) {
  return value === null ? "Sin respuestas" : `${Number(value).toFixed(1)}%`;
}

export function QuestionOptionsDetail({
  question,
  filters,
  onClose,
}: QuestionOptionsDetailProps) {
  const supportsOptions = question ? CLOSED_TYPES.has(question.tipo) : false;
  const variantsQuery = useReporteRendimientoGrupos(
    {
      idMateria: filters.idMateria,
      idMateriaDivision: filters.idMateriaDivision,
      idActividad: filters.idActividad,
      idPublicacion: filters.idPublicacion,
      fechaDesde: filters.fechaDesde,
      fechaHasta: filters.fechaHasta,
      estadoIntento: filters.estadoIntento,
      alcanceIntentos: filters.alcanceIntentos,
      estadoCorreccion: filters.estadoCorreccion,
      idGrupoPregunta: question ? String(question.idGrupoPregunta) : undefined,
      ordenarPor: "grupo",
      ordenDireccion: "asc",
      pagina: 1,
      limite: 100,
    },
    question !== null,
  );
  const groupLoading = variantsQuery.isPending || variantsQuery.isLoading || variantsQuery.isPlaceholderData;
  const groupVariants = groupLoading || variantsQuery.isError
    ? []
    : variantsQuery.data?.items
        .filter((group) => group.idGrupoPregunta === question?.idGrupoPregunta)
        .flatMap((group) => group.variantes)
        .filter((variant) => variant.claveContenido !== question?.claveContenido) ?? [];
  const resultsQuery = useResultadosVariantes(
    filters,
    groupVariants.map((variant) => variant.claveContenido),
    question !== null && !groupLoading && !variantsQuery.isError,
  );
  const variantsLoading = groupLoading || (groupVariants.length > 0 && (resultsQuery.isPending || resultsQuery.isLoading));
  const variantsError = variantsQuery.isError || resultsQuery.isError;
  const variants = groupVariants.map((variant) => ({
    variant,
    result: resultsQuery.data?.find((item) => item.claveContenido === variant.claveContenido),
  }));
  const query = useReporteOpcionesPregunta(
    supportsOptions ? question?.idPregunta ?? null : null,
    {
      ...filters,
      claveContenido: question?.claveContenido,
      pagina: 1,
      limite: 100,
      ordenarPor: "posicion",
      ordenDireccion: "asc",
    },
  );
  const evidenceData = query.isPlaceholderData ? undefined : query.data;
  const chartData = (evidenceData?.items ?? []).map((item) => ({
    opcion: `Opción ${item.posicion}`,
    texto: item.texto,
    porcentaje: item.porcentajeSeleccion === null ? null : Number(item.porcentajeSeleccion),
  }));
  const evidenceError =
    query.error instanceof ApiError &&
    [
      "QUESTION_CONTENT_NOT_FOUND",
      "QUESTION_OPTION_EVIDENCE_INCONSISTENT",
    ].includes(query.error.code ?? "");

  return (
    <Modal
      isOpen={question !== null}
      onClose={onClose}
      title="Detalle de la pregunta"
    >
      {question && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold text-slate-800">{question.enunciado}</p>
            <p className="mt-1 text-sm text-slate-500">
              Resumen de cómo fue respondida y del puntaje obtenido.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Veces presentada", question.presentadas],
              ["Respuestas calificadas", question.presentadas - question.pendientesCorreccion],
              ["Puntaje promedio obtenido", question.porcentajePuntajePromedio === null ? "Sin puntaje disponible" : percentage(question.porcentajePuntajePromedio)],
              [
                "Respuestas con tiempo registrado",
                `${(question.coberturaTemporal * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-bold uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-black text-slate-800">{value}</p>
              </div>
            ))}
          </div>
          {question.pendientesCorreccion > 0 && (
            <p className="text-sm text-slate-600">
              {question.respondidas} respondidas · {question.pendientesCorreccion} pendientes de calificación.
              {" "}El promedio utiliza únicamente las presentaciones con puntaje disponible dentro de los filtros del reporte.
            </p>
          )}
          {!supportsOptions && (
            <FeedbackMessage
              variant="info"
              message="Para preguntas abiertas o de código se muestran resultados generales, no respuestas individuales."
            />
          )}
          {supportsOptions && (query.isLoading || query.isPlaceholderData) && (
            <LoadingState message="Cargando distribución histórica de opciones…" />
          )}
          {supportsOptions && query.isError && evidenceError && (
            <FeedbackMessage
              variant="warning"
              message={
                query.error instanceof ApiError &&
                query.error.code === "QUESTION_CONTENT_NOT_FOUND"
                  ? "No se encontró evidencia histórica para este contenido. El resto del análisis continúa disponible."
                  : "Las versiones históricas de las opciones no pueden compararse. El resto del análisis continúa disponible."
              }
            />
          )}
          {supportsOptions && query.isError && !evidenceError && (
            <RequestErrorState
              error={query.error}
              fallback="No se pudo cargar la distribución de opciones."
              onRetry={() => void query.refetch()}
            />
          )}
          {supportsOptions && evidenceData && (
            <>
              <section aria-labelledby="option-results-title">
                <h3 id="option-results-title" className="text-sm font-bold text-slate-800">
                  Opciones elegidas
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  El porcentaje indica cuántas selecciones recibió cada opción entre todas las selecciones registradas.
                </p>
              </section>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Veces presentada", evidenceData.kpis.presentadas],
                  ["Con respuesta", evidenceData.kpis.respondidas],
                  ["Opciones marcadas", evidenceData.kpis.totalSelecciones],
                  ["Opciones incorrectas marcadas", evidenceData.kpis.seleccionesDistractores],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-bold uppercase text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-black text-slate-800">{Number(value).toLocaleString("es-AR")}</p>
                  </div>
                ))}
              </div>
              {chartData.length > 0 && (
                <div aria-hidden="true" className="space-y-4" data-testid="option-distribution-chart">
                  {chartData.map((item) => (
                    <div key={item.opcion} title={item.texto}>
                      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm text-slate-700">
                        <span className="font-semibold">{item.opcion}</span>
                        <span className="tabular-nums">{percentage(item.porcentaje)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded bg-slate-100">
                        <div className="h-full rounded" style={{ width: `${Math.max(0, Math.min(100, item.porcentaje ?? 0))}%`, backgroundColor: chartColors.primary }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div role="region" aria-label="Opciones completas, desplazamiento horizontal" tabIndex={0} className="overflow-x-auto rounded-xl border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
                <table aria-label="Distribución de opciones" className="w-full min-w-[560px] text-sm tabular-nums">
                  <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-3 py-2">Opción</th>
                      <th scope="col" className="px-3 py-2 text-center">Resultado</th>
                      <th scope="col" className="px-3 py-2 text-right">Selecciones</th>
                      <th scope="col" className="px-3 py-2 text-right">Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidenceData.items.map((item) => (
                      <tr key={`${item.claveContenido}-${item.posicion}`} className="border-t border-slate-100">
                        <td className="px-3 py-2.5 font-medium text-slate-700">{item.texto}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`rounded-full px-2 py-1 font-bold ${item.esCorrecta ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {item.esCorrecta ? "Respuesta correcta" : "Opción incorrecta"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{Number(item.selecciones).toLocaleString("es-AR")}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-800">{percentage(item.porcentajeSeleccion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {evidenceData.items.length === 0 && (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                  Esta pregunta no posee opciones registradas en los intentos filtrados.
                </p>
              )}
            </>
          )}
          <section aria-labelledby="variant-evidence-title" className="border-t border-slate-100 pt-4">
            <h3 id="variant-evidence-title" className="text-sm font-bold text-slate-800">
              Comparación con otras variantes
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Resultados por contenido con los mismos filtros del reporte, incluyendo sus apariciones en otros grupos de origen. Los pendientes no se cuentan como respuestas calificadas.
            </p>
            {variantsLoading ? (
              <LoadingState message="Cargando variantes del grupo…" />
            ) : variantsError ? (
              <RequestErrorState
                error={variantsQuery.error ?? resultsQuery.error}
                fallback="No se pudieron cargar los resultados de las variantes."
                onRetry={() => void (variantsQuery.isError ? variantsQuery.refetch() : resultsQuery.refetch())}
              />
            ) : variants.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                No hay otras variantes con resultados disponibles.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {variants.map(({ variant, result }) => (
                  <li key={`${variant.idPregunta}-${variant.claveContenido}`} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-bold text-slate-800">{variant.enunciado}</p>
                    {!result ? (
                      <p className="mt-2 text-sm text-slate-600">No hay resultados para este contenido dentro de los filtros del reporte.</p>
                    ) : <>
                    <p className="mt-2 text-sm text-slate-600">{result.presentadas} presentadas · {result.respondidas} respondidas · {result.pendientesCorreccion} pendientes de calificación</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                      <span>{(result.presentadas - result.pendientesCorreccion).toLocaleString("es-AR")} respuestas calificadas</span>
                      <strong className="text-slate-900">{result.porcentajePuntajePromedio === null ? "Sin puntaje disponible" : `${percentage(result.porcentajePuntajePromedio)} de puntaje promedio`}</strong>
                    </div>
                    {result.porcentajePuntajePromedio !== null && <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.min(100, Math.max(0, result.porcentajePuntajePromedio))}%` }}
                      />
                    </div>}
                    </>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
