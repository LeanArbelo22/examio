"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { obtenerReporteRendimientoEvaluaciones } from "@/services/api/reportes.api";
import { getAlumnos } from "@/services/api/alumnos.api";
import { getDocentes } from "@/services/api/docentes.api";
import { calendarMonthRange, dateInputValue } from "@/lib/institutional-report-config";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import type { OrdenDireccion } from "@/types";
import { AdminReportDetail } from "./AdminReportDetail";
import { PeopleReportScopeFields } from "./PeopleReportScopeFields";
import { loadPeopleReportCatalogs } from "./people-report-scope";
import { loadPeopleReportResults } from "./people-report-results";
import { formatReportNumber, institutionalRows, personRows, reportActionClass, reportInputClass, reportPeriod, reportSections, type AdminReportRow, type AdminReportSection } from "./admin-report-data";

type ListSort = "name" | "confirmed" | "average" | "pending";
const PAGE_SIZE = 20;
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");

export function AdminReportsWorkspace() {
  const { data: session, status } = useSession();
  const admin = session?.user?.role === "admin";
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const section = (reportSections.find((s) => s.id === params.get("seccion"))?.id ?? "carreras") as AdminReportSection;
  const personal = section === "alumnos" || section === "docentes";
  const [defaultPeriod] = useState(() => calendarMonthRange(12, "current"));
  const from = params.get("desde") ?? dateInputValue(defaultPeriod.fechaDesde);
  const to = params.get("hasta") ?? dateInputValue(defaultPeriod.fechaHasta);
  const period = reportPeriod(from, to);
  const careerId = params.get("carrera") ?? "";
  const matterId = section === "carreras" ? "" : params.get("materia") ?? "";
  const commissionId = personal ? params.get("comision") ?? "" : "";
  const search = params.get("busqueda") ?? "";
  const state = params.get("estado") ?? "";
  const sort = (["name", "confirmed", "average", "pending"].includes(params.get("orden") ?? "") ? params.get("orden") : "name") as ListSort;
  const direction: OrdenDireccion = params.get("direccion") === "desc" ? "desc" : "asc";
  const selectedKey = params.get("seleccion");
  const [validationError, setValidationError] = useState<string | null>(null);

  const overview = useQuery({
    queryKey: ["admin", "reportes", "jerarquia", period],
    queryFn: () => obtenerReporteRendimientoEvaluaciones({ ...period!, incluirResumenInstitucional: true, pagina: 1, limite: 1 }),
    enabled: admin && !personal && period !== null,
  });
  const people = useQuery({
    queryKey: ["admin", "reportes", section],
    queryFn: async () => section === "alumnos" ? personRows(await getAlumnos(), "alumnos") : personRows(await getDocentes(), "docentes"),
    enabled: admin && personal,
  });
  const catalogs = useQuery({ queryKey: ["admin", "reportes", "catalogos-academicos"], queryFn: loadPeopleReportCatalogs, enabled: admin && personal });
  const peopleResults = useQuery({
    queryKey: ["admin", "reportes", "resultados-personas", section, period, careerId, matterId, commissionId],
    queryFn: () => loadPeopleReportResults(section as "alumnos" | "docentes", { ...period!, idCarrera: careerId || undefined, idMateria: matterId || undefined, idMateriaDivision: commissionId || undefined }),
    enabled: admin && personal && period !== null,
  });
  const hierarchy = overview.data?.resumenInstitucional;
  const rows = useMemo(() => {
    const identities = new Map((people.data ?? []).map((row) => [row.code, row]));
    const source: AdminReportRow[] = personal ? (peopleResults.data ?? []).map((person) => ({
      ...(identities.get(person.code) ?? { key: String(person.code), code: person.code, context: `${section === "alumnos" ? "Matrícula" : "Legajo"} ${person.code}` }),
      name: `${person.apellido}, ${person.nombre}`,
      officialResults: person.resultadosOficiales,
    })) : institutionalRows(hierarchy, section);
    const filtered = source.filter((row) => (personal || !careerId || String(row.careerId) === careerId) && (personal || !matterId || String(row.matterId) === matterId) && (!personal || !state || row.state === state) && normalize(`${row.name} ${row.context} ${row.code} ${row.email ?? ""} ${row.teacher ?? ""}`).includes(normalize(search)));
    const getValue = (row: AdminReportRow) => {
      const results = row.officialResults ?? row.summary?.resultadosOficiales;
      return sort === "name" ? row.name : sort === "confirmed" ? results?.resultadosConsiderados : sort === "average" ? results?.promedioNotaBase10 : results?.resultadosPendientes;
    };
    return [...filtered].sort((a, b) => {
      const av = getValue(a), bv = getValue(b);
      if (av == null && bv != null) return 1;
      if (bv == null && av != null) return -1;
      const diff = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv, "es-AR") : Number(av ?? 0) - Number(bv ?? 0);
      return (direction === "asc" ? diff : -diff) || a.code - b.code;
    });
  }, [personal, people.data, peopleResults.data, hierarchy, section, careerId, matterId, state, search, sort, direction]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(params.get("pagina")) || 1));
  const selected = rows.find((row) => row.key === selectedKey);
  const query = personal ? people.isPending || people.isError ? people : peopleResults : overview;

  function navigate(updates: Record<string, string | number | undefined>, push = false) {
    const next = new URLSearchParams(params.toString());
    next.set("seccion", section);
    Object.entries(updates).forEach(([key, value]) => value == null || value === "" ? next.delete(key) : next.set(key, String(value)));
    router[push ? "push" : "replace"](`${pathname}?${next}`, { scroll: false });
  }
  const columns: ReportColumn<AdminReportRow, ListSort>[] = [
    { key: "name", header: reportSections.find((s) => s.id === section)!.label, sortKey: "name", render: (row) => <div className={selected ? "break-words" : "min-w-44"}><p className="font-semibold text-slate-900">{row.name}</p>{!selected && row.context && <p className="mt-1 text-sm text-slate-600">{row.context}</p>}{!selected && section === "comisiones" && <p className="mt-1 text-sm text-slate-600">{row.teacher ?? "Sin docente asignado"}</p>}</div> },
    ...(selected ? [] : personal ? [
      ...(!selected ? [{ key: "email", header: "Correo", render: (row: AdminReportRow) => row.email || "No informado" }] : []),
      { key: "state", header: "Estado", render: (row: AdminReportRow) => row.state === "activo" ? "Activo" : row.state === "suspendido" ? "Suspendido" : row.state === "inactivo" ? "Inactivo" : "No informado" },
      { key: "average", header: "Promedio /10", sortKey: "average" as const, align: "right" as const, render: (row: AdminReportRow) => formatReportNumber(row.officialResults?.promedioNotaBase10, 2) },
      { key: "approval", header: "Aprobación (%)", align: "right" as const, render: (row: AdminReportRow) => row.officialResults?.porcentajeAprobacion == null ? "Sin resultado" : `${formatReportNumber(row.officialResults.porcentajeAprobacion, 1)}%` },
    ] : [
      ...(section === "carreras" ? [{ key: "subjects", header: "Materias", align: "right" as const, render: (row: AdminReportRow) => formatReportNumber(row.subjectCount) }] : []),
      ...(!selected ? [{ key: "publications", header: "Publicaciones", align: "right" as const, render: (row: AdminReportRow) => formatReportNumber(row.summary?.publicaciones) }] : []),
      { key: "confirmed", header: "Confirmados", sortKey: "confirmed" as const, align: "right" as const, render: (row: AdminReportRow) => formatReportNumber(row.summary?.resultadosOficiales.resultadosConsiderados) },
      { key: "average", header: "Promedio /10", sortKey: "average" as const, align: "right" as const, render: (row: AdminReportRow) => formatReportNumber(row.summary?.resultadosOficiales.promedioNotaBase10, 2) },
      ...(!selected ? [
        { key: "approval", header: "Aprobación", align: "right" as const, render: (row: AdminReportRow) => row.summary?.resultadosOficiales.porcentajeAprobacion == null ? "Sin resultado" : `${formatReportNumber(row.summary.resultadosOficiales.porcentajeAprobacion, 1)}%` },
        { key: "pending", header: "Pendientes académicos", sortKey: "pending" as const, align: "right" as const, render: (row: AdminReportRow) => formatReportNumber(row.summary?.resultadosOficiales.resultadosPendientes) },
      ] : []),
    ]),
  ];

  if (status === "loading") return <p role="status">Verificando acceso…</p>;
  if (!admin) return <p role="alert" className="text-slate-700">Este módulo está disponible sólo para administradores.</p>;

  return <div className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">Reportes institucionales</h1><p className="mt-2 max-w-[65ch] text-base text-slate-600">Consultá datos institucionales y resultados.</p></div><Link href="/admin" className={reportActionClass}>Volver al panel</Link></div>
    <nav aria-label="Sección de reportes" className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {reportSections.map((item) => <button key={item.id} type="button" aria-current={section === item.id ? "page" : undefined} onClick={() => navigate({ seccion: item.id, seleccion: undefined, pagina: undefined, detallePagina: undefined, detalleVista: undefined, busqueda: undefined, estado: undefined, carrera: undefined, materia: undefined, comision: undefined, orden: undefined, direccion: undefined }, true)} className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${section === item.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{item.label}</button>)}
    </nav>
    <form key={`${section}:${params.toString()}`} onSubmit={(event) => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const values = Object.fromEntries(fields.entries()) as Record<string, string>;
      if (!reportPeriod(values.desde, values.hasta)) { setValidationError("Revisá las fechas: ingresá un período válido con inicio anterior o igual al fin."); return; }
      setValidationError(null);
      navigate({ ...values, seleccion: undefined, pagina: undefined, detallePagina: undefined, detalleVista: undefined });
    }} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className={`grid gap-3 sm:grid-cols-2 ${personal ? "xl:grid-cols-4" : section !== "carreras" ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">{personal ? "Buscar por nombre o identificador" : "Buscar registro"}<input name="busqueda" defaultValue={search} className={reportInputClass} placeholder={personal ? "Nombre, matrícula o legajo" : "Nombre o identificador"} /></label>
        {!personal && <ScopeFields hierarchy={hierarchy} section={section} careerId={careerId} matterId={matterId} />}
        {personal && <PeopleReportScopeFields catalog={catalogs.data} initial={{ career: careerId, matter: matterId, commission: commissionId }} loading={catalogs.isPending} />}{personal && <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Estado<select name="estado" defaultValue={state} className={reportInputClass}><option value="">Todos</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option>{section === "alumnos" && <option value="suspendido">Suspendidos</option>}</select></label>}
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Resultados desde<input name="desde" type="date" required defaultValue={from} className={reportInputClass} /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Resultados hasta<input name="hasta" type="date" required defaultValue={to} className={reportInputClass} /></label>
      </div>
      <div className="mt-4 flex justify-end gap-2"><button type="button" className={reportActionClass} onClick={() => { setValidationError(null); navigate({ busqueda: undefined, estado: undefined, carrera: undefined, materia: undefined, comision: undefined, desde: undefined, hasta: undefined, seleccion: undefined, pagina: undefined, detallePagina: undefined, detalleVista: undefined }); }}>Limpiar</button><button type="submit" className="min-h-11 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">Aplicar</button></div>
    </form>
    {personal && catalogs.isError && <RequestErrorState error={catalogs.error} fallback="No se pudieron cargar las opciones de carrera, materia y comisión." onRetry={() => void catalogs.refetch()} />}
    {(validationError || !period) && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{validationError ?? "El período de la dirección no es válido. Revisá las fechas y aplicá los filtros."}</p>}
    {period && <div className={`grid min-w-0 items-start gap-5 ${selected ? "xl:grid-cols-[minmax(16rem,0.6fr)_minmax(0,1.4fr)]" : ""}`}>
      <section aria-label={`Listado de ${section}`} className="min-w-0 space-y-3">
        <div className="flex items-baseline justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">{reportSections.find((s) => s.id === section)!.label}</h2>{!query.isPending && !query.isError && <span className="text-sm text-slate-600">{rows.length.toLocaleString("es-AR")} registros</span>}</div>
        {query.isPending && <p role="status" className="rounded-xl bg-slate-100 p-6 text-slate-600">Cargando registros…</p>}
        {query.isError && <RequestErrorState error={query.error} fallback="No se pudieron cargar los registros." onRetry={() => void query.refetch()} />}
        {query.isSuccess && (!personal && !hierarchy ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">No se recibió el resumen institucional. Reintentá la consulta.</p> : <ReportTable columns={columns} rows={rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)} rowKey={(row) => row.key} sortBy={sort} sortDirection={direction} onSort={(orden, direccion) => navigate({ orden, direccion, pagina: undefined })} onRowClick={(row) => navigate({ seleccion: row.key, detallePagina: undefined, detalleVista: undefined }, true)} rowActionLabel={(row) => `Ver detalle de ${row.name}`} selectedRowKey={selected?.key ?? null} minWidth={selected ? 0 : personal ? 600 : 820} page={page} totalPages={pages} total={rows.length} itemLabel={section} onPageChange={(pagina) => navigate({ pagina })} emptyMessage={personal ? "No hay personas que coincidan con los filtros. Probá otra búsqueda o estado." : "No hay entidades con publicaciones para este período y estos filtros."} />)}
        {selectedKey && !selected && query.isSuccess && <p role="status" className="text-sm text-slate-600">El registro seleccionado no está disponible con estos filtros. <button className="min-h-11 underline text-indigo-700" onClick={() => navigate({ seleccion: undefined })}>Cerrar selección</button></p>}
      </section>
      {selected && <AdminReportDetail key={`${section}:${selected.key}:${from}:${to}`} row={selected} section={section} period={period} scope={personal ? { idCarrera: careerId || undefined, idMateria: matterId || undefined, idMateriaDivision: commissionId || undefined } : undefined} hierarchy={hierarchy} page={Math.max(1, Number(params.get("detallePagina")) || 1)} view={params.get("detalleVista") === "relaciones" ? "relaciones" : "evaluaciones"} onClose={() => navigate({ seleccion: undefined, detallePagina: undefined, detalleVista: undefined }, true)} onView={(detalleVista) => navigate({ detalleVista, detallePagina: undefined })} onPage={(detallePagina) => navigate({ detallePagina })} onRelated={(row, section) => navigate({ seccion: section, carrera: String(row.careerId), materia: section === "comisiones" ? String(row.matterId) : undefined, seleccion: row.key, pagina: undefined, detallePagina: undefined, detalleVista: undefined, busqueda: undefined, estado: undefined }, true)} />}
    </div>}
  </div>;
}

function ScopeFields({ hierarchy, section, careerId, matterId }: { hierarchy: Parameters<typeof institutionalRows>[0]; section: AdminReportSection; careerId: string; matterId: string }) {
  const [career, setCareer] = useState(careerId);
  const [matter, setMatter] = useState(matterId);
  const careers = hierarchy?.carreras ?? [];
  const matters = careers.filter((c) => !career || String(c.idCarrera) === career).flatMap((c) => c.materias);
  return <>
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Carrera<select name="carrera" value={career} className={reportInputClass} onChange={(e) => { setCareer(e.target.value); setMatter(""); }}><option value="">Todas</option>{careers.map((c) => <option key={c.idCarrera} value={c.idCarrera}>{c.carrera}</option>)}</select></label>
    {section !== "carreras" && <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Materia<select name="materia" value={matter} className={reportInputClass} onChange={(e) => setMatter(e.target.value)}><option value="">Todas</option>{matters.map((m) => <option key={m.idMateria} value={m.idMateria}>{m.materia}</option>)}</select></label>}
  </>;
}
