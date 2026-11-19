"use client";

import { useState } from "react";
import { reportInputClass } from "./admin-report-data";
import type { PeopleReportCatalogs, PeopleScope } from "./people-report-scope";

export function PeopleReportScopeFields({ catalog, initial, loading }: { catalog?: PeopleReportCatalogs; initial: PeopleScope; loading: boolean }) {
  const [scope, setScope] = useState(initial);
  const matters = catalog?.matters.filter((x) => !scope.career || String(x.idCarrera) === scope.career) ?? [];
  const commissions = catalog?.commissions.filter((x) => {
    const matter = catalog.matters.find((m) => m.id === x.idMateria);
    return (!scope.matter || String(x.idMateria) === scope.matter) && (!scope.career || String(matter?.idCarrera) === scope.career);
  }) ?? [];
  return <>
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Carrera<select name="carrera" value={scope.career} disabled={loading || !catalog} className={reportInputClass} onChange={(e) => setScope({ career: e.target.value, matter: "", commission: "" })}><option value="">Todas</option>{catalog?.careers.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Materia<select name="materia" value={scope.matter} disabled={loading || !catalog} className={reportInputClass} onChange={(e) => setScope((current) => ({ ...current, matter: e.target.value, commission: "" }))}><option value="">Todas</option>{matters.map((x) => <option key={x.id} value={x.id}>{x.nombre}{!scope.career ? ` · ${catalog?.careers.find((c) => c.id === x.idCarrera)?.nombre ?? ""}` : ""}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Comisión<select name="comision" value={scope.commission} disabled={loading || !catalog} className={reportInputClass} onChange={(e) => setScope((current) => ({ ...current, commission: e.target.value }))}><option value="">Todas</option>{commissions.map((x) => <option key={x.idMateriaDivision} value={x.idMateriaDivision}>{x.division} · {x.materia} · #{x.idMateriaDivision}</option>)}</select></label>
  </>;
}
