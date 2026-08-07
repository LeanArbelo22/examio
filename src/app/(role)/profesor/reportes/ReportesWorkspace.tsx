"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EvaluacionesReport } from "./EvaluacionesReport";
import { RendimientoReport } from "./RendimientoReport";

const reports = [
  { id: "alumnos", label: "Por alumno" },
  { id: "evaluaciones", label: "Por evaluación" },
] as const;

export function ReportesWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected =
    searchParams.get("reporte") === "evaluaciones"
      ? "evaluaciones"
      : "alumnos";

  const selectReport = (report: (typeof reports)[number]["id"]) => {
    const params = new URLSearchParams();
    if (report !== "alumnos") params.set("reporte", report);
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-5">
      <nav
        aria-label="Tipo de reporte"
        className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      >
        {reports.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => selectReport(report.id)}
            aria-current={selected === report.id ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              selected === report.id
                ? "bg-indigo-600 text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            {report.label}
          </button>
        ))}
      </nav>
      {selected === "evaluaciones" ? (
        <EvaluacionesReport />
      ) : (
        <RendimientoReport />
      )}
    </div>
  );
}
