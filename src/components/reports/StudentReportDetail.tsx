"use client";

import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { Modal } from "@/components/ui/Modal";
import { ReportKpiGrid } from "./ReportKpiGrid";
import { useDetalleRendimientoAlumno } from "@/hooks/useReportes";
import type { ReporteRendimientoFiltros } from "@/types/index";

interface StudentReportDetailProps {
  matricula: number | null;
  filters: ReporteRendimientoFiltros;
  onClose: () => void;
}

export function StudentReportDetail({ matricula, filters, onClose }: StudentReportDetailProps) {
  const { data, isLoading, isError, error } = useDetalleRendimientoAlumno(matricula, filters);

  return (
    <Modal isOpen={matricula !== null} onClose={onClose} title={data ? `${data.alumno.nombre} ${data.alumno.apellido} · ${data.alumno.matricula}` : "Detalle de rendimiento"}>
      {isLoading && <DetailSkeleton />}
      {isError && (
        <RequestErrorState
          error={error}
          fallback="No se pudo cargar el detalle del alumno."
        />
      )}
      {data && (
        <div className="space-y-5">
          <ReportKpiGrid items={[
            { label: "Promedio", value: data.kpis.promedioGeneral.toFixed(2), tone: "indigo" },
            { label: "Intentos", value: String(data.kpis.totalIntentos), tone: "blue" },
            { label: "Mejor resultado", value: data.actividades.length ? Math.max(...data.actividades.map((item) => item.notaMaxima)).toFixed(2) : "—", tone: "amber" },
            { label: "Aprobación", value: `${data.kpis.porcentajeAprobacion.toFixed(1)}%`, tone: "emerald" },
          ]} />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Historial de actividades</h3>
            <p className="mt-1 text-xs text-slate-400">El contrato actual informa métricas agrupadas y el mejor intento de cada actividad.</p>
          </div>
          {data.actividades.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">No hay actividades para los filtros aplicados.</div>
          ) : (
            <div className="space-y-3">
              {data.actividades.map((actividad) => (
                <article key={actividad.idActividad} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{actividad.titulo}</h4>
                      <p className="mt-1 text-xs text-slate-500">{actividad.materia} · {actividad.division} · {actividad.tipo}</p>
                    </div>
                    <span className="self-start rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{actividad.intentos} intentos</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Metric label="Nota promedio" value={actividad.notaPromedio.toFixed(2)} />
                    <Metric label="Nota máxima" value={actividad.notaMaxima.toFixed(2)} />
                    <Metric label="Mejor intento" value={actividad.mejorIntento ? `#${actividad.mejorIntento.numeroIntento}` : "—"} />
                    <Metric label="Nota obtenida" value={actividad.mejorIntento?.notaFinal?.toFixed(2) ?? "—"} />
                  </dl>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 text-sm font-black text-slate-700">{value}</dd></div>;
}

function DetailSkeleton() {
  return <div className="space-y-4" aria-label="Cargando detalle"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}</div>{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}</div>;
}
