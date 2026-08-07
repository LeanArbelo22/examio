import { Suspense } from "react";
import { ReportesWorkspace } from "./ReportesWorkspace";

export default function ReportesPage() {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100" aria-label="Cargando reporte" />}><ReportesWorkspace /></Suspense>;
}
