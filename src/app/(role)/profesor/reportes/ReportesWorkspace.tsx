"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EvaluacionesReport } from "./EvaluacionesReport";
import { RendimientoReport } from "./RendimientoReport";
import { ContentPerformanceReport } from "./ContentPerformanceReport";

const reports = [
  { id: "alumnos", label: "Por alumno" },
  { id: "evaluaciones", label: "Por evaluación" },
  { id: "preguntas", label: "Por pregunta" },
  { id: "grupos", label: "Por grupo" },
] as const;

export function ReportesWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("reporte");
  const selected = reports.some((report) => report.id === requested)
    ? (requested as (typeof reports)[number]["id"])
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
        className="flex w-fit max-w-full flex-wrap rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
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
      {selected === "evaluaciones" && <EvaluacionesReport />}
      {selected === "alumnos" && <RendimientoReport />}
      {selected === "preguntas" && <ContentPerformanceReport kind="preguntas" />}
      {selected === "grupos" && <ContentPerformanceReport kind="grupos" />}
    </div>
  );
}
