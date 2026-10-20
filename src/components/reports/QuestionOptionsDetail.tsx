"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReporteOpcionesPregunta } from "@/hooks/useReportes";
import type {
  ReporteGrupoVariante,
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
  variants?: ReporteGrupoVariante[];
  onClose: () => void;
}

const CLOSED_TYPES = new Set(["mc", "multiple", "vf"]);

function percentage(value: number | null) {
  return value === null ? "Sin respuestas" : `${Number(value).toFixed(1)}%`;
}

export function QuestionOptionsDetail({
  question,
  filters,
  variants = [],
  onClose,
}: QuestionOptionsDetailProps) {
  const supportsOptions = question ? CLOSED_TYPES.has(question.tipo) : false;
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
    porcentaje: Number(item.porcentajeSeleccion ?? 0),
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
            <p className="mt-1 text-xs text-slate-500">
              Resumen de cómo fue respondida y del puntaje obtenido.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Veces presentada", question.presentacionesOficiales],
              ["Respuestas calificadas", question.muestrasConfirmadas],
              ["Puntaje promedio obtenido", percentage(question.porcentajePuntajePromedio)],
              [
                "Respuestas con tiempo registrado",
                `${(question.coberturaTemporal * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-black text-slate-800">{value}</p>
              </div>
            ))}
          </div>
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
                <h3 id="option-results-title" className="text-sm font-black text-slate-800">
                  Opciones elegidas
                </h3>
                <p className="mt-1 text-xs text-slate-500">
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
                    <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-black text-slate-800">{Number(value).toLocaleString("es-AR")}</p>
                  </div>
                ))}
              </div>
              {chartData.length > 0 && (
                <div className="h-64" aria-label="Porcentaje de selección de cada opción">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="opcion" width={150} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value) => [`${Number(value).toFixed(1)}%`, "Selecciones"]}
                        labelFormatter={(label, payload) => payload[0]?.payload?.texto ?? label}
                      />
                      <Bar dataKey="porcentaje" fill="#4f46e5" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[560px] text-xs">
                  <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Opción</th>
                      <th className="px-3 py-2 text-center">Resultado</th>
                      <th className="px-3 py-2 text-right">Selecciones</th>
                      <th className="px-3 py-2 text-right">Porcentaje</th>
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
            <h3 id="variant-evidence-title" className="text-sm font-black text-slate-800">
              Comparación con otras variantes
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Cada variante muestra el promedio del puntaje obtenido y cuántas respuestas calificadas lo respaldan.
            </p>
            {variants.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                No hay otras variantes con resultados disponibles.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {variants.map((variant) => (
                  <li key={`${variant.idPregunta}-${variant.claveContenido}`} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-bold text-slate-800">{variant.enunciado}</p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600">
                      <span>{variant.muestrasConfirmadas.toLocaleString("es-AR")} respuestas calificadas</span>
                      <strong className="text-slate-900">{percentage(variant.porcentajePuntajePromedio)} de puntaje promedio</strong>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.min(100, Math.max(0, variant.porcentajePuntajePromedio ?? 0))}%` }}
                      />
                    </div>
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
