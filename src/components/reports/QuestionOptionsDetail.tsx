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
import type { ReporteOpcionesFiltros, ReportePreguntaItem } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { LoadingState } from "@/components/ui/LoadingState";

interface QuestionOptionsDetailProps {
  question: ReportePreguntaItem | null;
  filters: ReporteOpcionesFiltros;
  onClose: () => void;
}

function percentage(value: number | null) {
  return value === null ? "Sin respuestas" : `${Number(value).toFixed(1)}%`;
}

export function QuestionOptionsDetail({
  question,
  filters,
  onClose,
}: QuestionOptionsDetailProps) {
  const query = useReporteOpcionesPregunta(question?.idPregunta ?? null, {
    ...filters,
    pagina: 1,
    limite: 100,
    ordenarPor: "posicion",
    ordenDireccion: "asc",
  });
  const chartData = (query.data?.items ?? []).map((item) => ({
    opcion: item.texto.length > 36 ? `${item.texto.slice(0, 35)}…` : item.texto,
    porcentaje: Number(item.porcentajeSeleccion ?? 0),
  }));

  return (
    <Modal
      isOpen={question !== null}
      onClose={onClose}
      title="Opciones y distractores"
    >
      {question && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold text-slate-800">{question.enunciado}</p>
            <p className="mt-1 text-xs text-slate-500">
              La distribución utiliza las opciones congeladas cuando cada alumno inició su intento.
            </p>
          </div>
          {query.isLoading && <LoadingState message="Cargando distribución de opciones…" />}
          {query.isError && (
            <RequestErrorState
              error={query.error}
              fallback="No se pudo cargar la distribución de opciones."
              onRetry={() => void query.refetch()}
            />
          )}
          {query.data && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Presentadas", query.data.kpis.presentadas],
                  ["Respondidas", query.data.kpis.respondidas],
                  ["Selecciones", query.data.kpis.totalSelecciones],
                  ["Distractores elegidos", query.data.kpis.seleccionesDistractores],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-black text-slate-800">{Number(value).toLocaleString("es-AR")}</p>
                  </div>
                ))}
              </div>
              {chartData.length > 0 && (
                <div className="h-64" aria-label="Gráfico de selección de opciones">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="opcion" width={150} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, "Selección"]} />
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
                      <th className="px-3 py-2 text-center">Tipo</th>
                      <th className="px-3 py-2 text-right">Selecciones</th>
                      <th className="px-3 py-2 text-right">Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.items.map((item) => (
                      <tr key={`${item.claveContenido}-${item.posicion}`} className="border-t border-slate-100">
                        <td className="px-3 py-2.5 font-medium text-slate-700">{item.texto}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`rounded-full px-2 py-1 font-bold ${item.esCorrecta ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {item.esCorrecta ? "Correcta" : "Distractor"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{Number(item.selecciones).toLocaleString("es-AR")}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-800">{percentage(item.porcentajeSeleccion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {query.data.items.length === 0 && (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                  Esta pregunta no posee opciones registradas en los intentos filtrados.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
