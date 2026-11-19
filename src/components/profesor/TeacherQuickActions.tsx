import Link from "next/link";

const secondaryActionClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:w-auto";

export function TeacherQuickActions() {
  return (
    <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] xl:flex-row xl:items-center">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Centro de Gestión Docente
        </h2>
        <p className="mt-1 max-w-[65ch] text-pretty text-base leading-relaxed text-slate-600">
          Diseñá entornos seguros y monitoreá rendimientos.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-wrap sm:flex-row sm:items-center xl:ml-auto xl:w-auto">
        <Link
          href="/profesor/crear-examen"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Crear actividad
        </Link>
        <Link href="/profesor/banco-preguntas" className={secondaryActionClass}>
          Banco de preguntas
        </Link>
        <Link href="/profesor/reportes" className={secondaryActionClass}>
          Reportes
        </Link>
      </div>
    </section>
  );
}
