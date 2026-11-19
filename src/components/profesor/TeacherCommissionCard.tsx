import type { TeacherCommissionGroup } from "@/lib/teacher-evaluations";

export function TeacherCommissionCard({
  comision,
  onSelect,
}: {
  comision: TeacherCommissionGroup;
  onSelect: () => void;
}) {
  return (
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.04)]">
      <div>
        <h3 className="break-words text-balance text-xl font-bold leading-snug tracking-tight text-slate-900">
          {comision.division}
        </h3>
        <p className="mt-3 text-sm text-slate-500">
          {comision.alumnosInscriptos} alumno
          {comision.alumnosInscriptos !== 1 ? "s" : ""} · {comision.evaluaciones.length}{" "}
          actividad{comision.evaluaciones.length !== 1 ? "es" : ""}
        </p>
      </div>

      <button
        type="button"
        onClick={onSelect}
        className="mt-6 block min-h-11 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Ver actividades
      </button>
    </article>
  );
}
