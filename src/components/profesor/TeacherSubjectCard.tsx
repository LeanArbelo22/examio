import type { TeacherSubjectGroup } from "@/lib/teacher-evaluations";

export function TeacherSubjectCard({
  materia,
  onSelect,
}: {
  materia: TeacherSubjectGroup;
  onSelect: () => void;
}) {
  return (
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.04)]">
      <div>
        <h3 className="break-words text-balance text-xl font-bold leading-snug tracking-tight text-slate-900">
          {materia.materia}
        </h3>
        <p className="mt-1 text-sm text-slate-500">{materia.carrera}</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
          <div>
            <dt className="text-sm font-semibold text-slate-500">
              Comisiones
            </dt>
            <dd className="mt-1 text-lg font-black text-slate-800">
              {materia.comisiones.length}
            </dd>
          </div>
          <div className="border-l border-slate-200">
            <dt className="text-sm font-semibold text-slate-500">
              Actividades
            </dt>
            <dd className="mt-1 text-lg font-black text-slate-800">
              {materia.evaluaciones.length}
            </dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        onClick={onSelect}
        className="mt-6 block min-h-11 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Ver materia
      </button>
    </article>
  );
}
