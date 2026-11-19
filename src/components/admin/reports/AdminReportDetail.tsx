"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { obtenerReporteRendimientoEvaluaciones } from "@/services/api/reportes.api";
import { getAlumnosPorComision } from "@/services/api/comisiones.api";
import { getMateriasAlumno } from "@/services/api/alumnos.api";
import { getMateriasPorDocente } from "@/services/api/docentes.api";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import type { ReporteEvaluacionItem, ReporteEvaluacionesFiltros, ReporteEvaluacionesOrden, ResultadosOficiales, ResumenInstitucional } from "@/types";
import { formatReportNumber as number, institutionalRows, reportActionClass, type AdminReportRow, type AdminReportSection } from "./admin-report-data";

interface Props {
  row: AdminReportRow;
  section: AdminReportSection;
  period: { fechaDesde: string; fechaHasta: string };
  scope?: Pick<ReporteEvaluacionesFiltros, "idCarrera" | "idMateria" | "idMateriaDivision">;
  hierarchy?: ResumenInstitucional;
  page: number;
  view: "evaluaciones" | "relaciones";
  onPage: (page: number) => void;
  onView: (view: "evaluaciones" | "relaciones") => void;
  onClose: () => void;
  onRelated: (row: AdminReportRow, section: AdminReportSection) => void;
}

export function AdminReportDetail({ row, section, period, scope, hierarchy, page, view, onPage, onView, onClose, onRelated }: Props) {
  const panel = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [sort, setSort] = useState<{ key: ReporteEvaluacionesOrden; direction: "asc" | "desc" }>({ key: "fecha", direction: "desc" });
  const filters: ReporteEvaluacionesFiltros = {
    ...period,
    ...scope,
    ...(section === "carreras" ? { idCarrera: String(row.careerId) } : section === "materias" ? { idCarrera: String(row.careerId), idMateria: String(row.matterId) } : section === "comisiones" ? { idMateriaDivision: String(row.commissionId) } : section === "alumnos" ? { matriculaAlumno: String(row.code) } : { legajoDocente: String(row.code) }),
    alcanceIntentos: "validos", pagina: page, limite: 10, ordenarPor: sort.key, ordenDireccion: sort.direction,
  };
  const query = useQuery({ queryKey: ["admin", "reportes", "detalle", filters], queryFn: () => obtenerReporteRendimientoEvaluaciones(filters) });
  const relationLabel = section === "carreras" ? "Materias" : section === "materias" ? "Comisiones" : section === "comisiones" ? "Alumnos inscriptos" : section === "alumnos" ? "Inscripciones actuales" : "Asignaciones actuales";
  const academic = query.data?.kpis.resultadosOficiales;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    title.current?.focus({ preventScroll: true });
    if (window.matchMedia?.("(max-width: 1279px)").matches) panel.current?.scrollIntoView?.({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);

  const columns: ReportColumn<ReporteEvaluacionItem, ReporteEvaluacionesOrden>[] = [
    { key: "name", header: "Evaluación", sortKey: "evaluacion", render: (x) => <div className="break-words"><p className="font-semibold text-slate-900">{x.materia}</p><p className="mt-1 text-slate-600">Comisión {x.division}</p><p className="mt-2 text-sm text-slate-600">{x.titulo}</p></div> },
    { key: "confirmed", header: "Confirmados", align: "right", render: (x) => number(x.resultadosOficiales.resultadosConsiderados) },
    { key: "average", header: "Promedio /10", align: "right", render: (x) => number(x.resultadosOficiales.promedioNotaBase10, 2) },
    { key: "approval", header: "Aprobación", align: "right", render: (x) => x.resultadosOficiales.porcentajeAprobacion === null ? "Sin resultado" : `${number(x.resultadosOficiales.porcentajeAprobacion, 1)}%` },
    { key: "pending", header: "Pendientes académicos", align: "right", render: (x) => number(x.resultadosOficiales.resultadosPendientes) },
  ];

  return <section ref={panel} aria-labelledby="admin-report-detail-title" className="min-w-0 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 ref={title} tabIndex={-1} id="admin-report-detail-title" className="break-words text-xl font-bold text-slate-900 outline-none">{row.name}</h2><p className="mt-2 break-words text-sm text-slate-600">{row.context}</p>{row.email && <p className="mt-1 break-words text-sm text-slate-600">{row.email}</p>}{section === "comisiones" && <p className="mt-1 text-sm text-slate-600">Docente actual: {row.teacher === null ? "Sin asignar" : row.teacher ?? "No informado"}</p>}</div><button onClick={onClose} className={`${reportActionClass} shrink-0`} type="button">Cerrar detalle</button></div>
    {section === "docentes" && <p className="mt-3 text-sm leading-relaxed text-slate-600">Resultados de las evaluaciones de sus asignaciones actuales. No representan una calificación del desempeño docente.</p>}
    <div className="mt-5 space-y-4">
      {query.isPending && <p role="status" className="rounded-xl bg-slate-50 p-5 text-slate-600">Cargando resultados oficiales…</p>}
      {query.isError && <RequestErrorState error={query.error} fallback="No se pudieron cargar los resultados del registro." onRetry={() => void query.refetch()} />}
      {query.isSuccess && (academic ? <OfficialSummary data={academic} /> : <p role="alert" className="text-amber-900">No se recibieron los resultados oficiales. No se pueden interpretar como cero.</p>)}
      <nav aria-label="Contenido del detalle" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">{([['evaluaciones', 'Evaluaciones'], ['relaciones', relationLabel]] as const).map(([value, label]) => <button type="button" key={value} aria-current={view === value ? "page" : undefined} onClick={() => onView(value)} className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${view === value ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}>{label}</button>)}</nav>
      {view === "evaluaciones" ? <div className="space-y-3 [&_table]:table-fixed [&_th:first-child]:w-[38%]"><p className="text-sm leading-relaxed text-slate-600">Resultados oficiales de evaluaciones, no aprobación final de materias.</p>{query.data && <ReportTable columns={columns} rows={query.data.evaluaciones} rowKey={(x) => x.idPublicacion} sortBy={sort.key} sortDirection={sort.direction} onSort={(key, direction) => { setSort({ key, direction }); onPage(1); }} page={query.data.paginacion.pagina} totalPages={query.data.paginacion.totalPaginas} total={query.data.paginacion.total} itemLabel="evaluaciones del registro" minWidth={600} onPageChange={onPage} emptyMessage="No hay publicaciones con actividad para este registro y período. Esto no implica una nota cero." />}</div> : <Relations row={row} section={section} hierarchy={hierarchy} page={page} onPage={onPage} onRelated={onRelated} />}
    </div>
  </section>;
}

function OfficialSummary({ data }: { data: ResultadosOficiales }) {
  const stats = [
    ["Resultados confirmados", number(data.resultadosConsiderados)],
    ["Promedio sobre 10", number(data.promedioNotaBase10, 2)],
    ["Aprobación observada", data.porcentajeAprobacion == null ? "Sin resultado" : `${number(data.porcentajeAprobacion, 1)}%`],
    ["Pendientes académicos", number(data.resultadosPendientes)],
    ["Aprobados / desaprobados", `${number(data.aprobados)} / ${number(data.desaprobados)}`],
    ["Cobertura de corrección", data.porcentajeCoberturaConfirmada == null ? "Sin resultado" : `${number(data.porcentajeCoberturaConfirmada, 1)}%`],
  ];
  return <div className="border-y border-slate-200 py-4"><h3 className="text-base font-semibold text-slate-900">Resultados oficiales</h3><dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">{stats.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm leading-relaxed text-slate-600">{label}</dt><dd className="mt-1 break-words text-lg font-semibold tabular-nums text-slate-900">{value}</dd></div>)}</dl><p className="mt-4 text-sm text-slate-600">{number(data.resultadosConsiderados)} resultados confirmados de {number(data.intentosValidosEntregados)} intentos válidos entregados. Sólo correcciones confirmadas con nota final.</p></div>;
}

function Relations({ row, section, hierarchy, page, onPage, onRelated }: Pick<Props, "row" | "section" | "hierarchy" | "page" | "onPage" | "onRelated">) {
  const structural = section === "carreras" || section === "materias";
  const children = structural ? institutionalRows(hierarchy, section === "carreras" ? "materias" : "comisiones").filter((x) => section === "carreras" ? x.careerId === row.careerId : x.matterId === row.matterId) : [];
  const query = useQuery({
    queryKey: ["admin", "reportes", "relaciones-actuales", section, row.code],
    enabled: !structural,
    queryFn: async () => {
      if (section === "comisiones") return [...new Map((await getAlumnosPorComision(row.code)).map((x) => [x.matricula, { key: String(x.matricula), name: x.nombreAlumno, context: `Matrícula ${x.matricula}` }])).values()];
      if (section === "alumnos") return (await getMateriasAlumno(row.code)).map((x, i) => ({ key: String(i), name: x.materia, context: `Comisión ${x.division}` }));
      return (await getMateriasPorDocente(row.code)).map((x) => ({ key: String(x.idComision), name: x.nombreMateria, context: `${x.carrera} · Comisión ${x.division}` }));
    },
  });
  const source = structural ? children.map((x) => ({ key: x.key, name: x.name, context: x.context, row: x })) : (query.data ?? []).map((x) => ({ ...x, row: undefined }));
  const pages = Math.max(1, Math.ceil(source.length / 10));
  const current = Math.min(page, pages);
  return <div className="space-y-3"><p className="text-sm leading-relaxed text-slate-600">{structural ? "Entidades con publicaciones dentro del período consultado." : "Relaciones actuales. No representan el historial de inscripciones o asignaciones del período."}</p>
    {!structural && query.isPending && <p role="status" className="p-4 text-slate-600">Cargando relaciones…</p>}
    {!structural && query.isError && <RequestErrorState error={query.error} fallback="No se pudieron cargar las relaciones actuales." onRetry={() => void query.refetch()} />}
    {(structural || query.isSuccess) && (source.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No hay relaciones para mostrar.</p> : <><ul className="divide-y divide-slate-100">{source.slice((current - 1) * 10, current * 10).map((x) => <li key={x.key} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold text-slate-900">{x.name}</p><p className="mt-1 text-sm text-slate-600">{x.context}</p></div>{x.row && <button type="button" className={reportActionClass} onClick={() => onRelated(x.row!, section === "carreras" ? "materias" : "comisiones")}>Ver detalle</button>}</li>)}</ul><div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600"><span>{source.length} registros · Página {current} de {pages}</span><div className="flex gap-2"><button type="button" disabled={current <= 1} className={`${reportActionClass} disabled:opacity-40`} onClick={() => onPage(current - 1)}>Anterior</button><button type="button" disabled={current >= pages} className={`${reportActionClass} disabled:opacity-40`} onClick={() => onPage(current + 1)}>Siguiente</button></div></div></>)}
  </div>;
}
