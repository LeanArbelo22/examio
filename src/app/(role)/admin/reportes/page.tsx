import { Suspense } from "react";
import { AdminReportsWorkspace } from "@/components/admin/reports/AdminReportsWorkspace";

export default function AdminReportesPage() {
  return <Suspense fallback={<p role="status" className="p-6 text-slate-600">Cargando reportes institucionales…</p>}><AdminReportsWorkspace /></Suspense>;
}
