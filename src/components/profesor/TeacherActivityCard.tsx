import Link from "next/link";
import type { EstadoActividad, EvaluacionDocente } from "@/types";

interface BadgeConfig {
  label: string;
  className: string;
}

function getStatusBadge(
  fechaInicio: string,
  fechaFin: string,
  estado: EstadoActividad,
): BadgeConfig {
  if (estado === "archivada") {
    return {
      label: "Archivado",
      className: "border border-slate-200 bg-slate-100 text-slate-500",
    };
  }
  if (estado === "borrador") {
    return {
      label: "Borrador",
      className: "border border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  const now = new Date();
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  if (now < inicio) {
    return {
      label: "Programado",
      className: "border border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (now >= inicio && now <= fin) {
    return {
      label: "Activo",
      className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  return {
    label: "Finalizado",
    className: "border border-slate-200 bg-slate-100 text-slate-500",
  };
}

export function TeacherActivityCard({ evaluacion }: { evaluacion: EvaluacionDocente }) {
  const badge = getStatusBadge(
    evaluacion.fechaInicio,
    evaluacion.fechaFin,
    evaluacion.estado,
  );
  const detailHref =
    evaluacion.estado === "borrador"
      ? `/profesor/examen/${evaluacion.idPublicacion}/editar`
      : `/profesor/examen/${evaluacion.idPublicacion}`;

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-shadow duration-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.03)]">
      <div>
        <div className="mb-3 flex items-start justify-between">
          <span
            className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${badge.className}`}
          >
            {badge.label}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {evaluacion.duracionMinutos
              ? `${evaluacion.duracionMinutos} min`
              : "Sin límite"}
          </span>
        </div>

        <h3 className="mb-1 text-lg font-bold tracking-tight text-slate-800">
          {evaluacion.titulo}
        </h3>
        <p className="mb-3 text-xs font-medium text-slate-500">
          {evaluacion.materia} · {evaluacion.division}
        </p>

        <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-500">
          <div className="flex-1 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Asignados
            </p>
            <p className="text-lg font-black text-slate-800">
              {evaluacion.alumnosInscriptos}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex-1 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Rendidos
            </p>
            <p className="text-lg font-black text-slate-800">
              {evaluacion.totalIntentos}
            </p>
          </div>
        </div>

        <p className="text-xs font-medium text-slate-500">
          {evaluacion.cantidadIntentosMaximos} intento
          {evaluacion.cantidadIntentosMaximos !== 1 ? "s" : ""} máximo
        </p>
      </div>

      <Link
        href={detailHref}
        className="mt-6 block w-full rounded-xl bg-indigo-600 px-4 py-2 text-center text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {evaluacion.estado === "borrador"
          ? "Continuar borrador"
          : "Gestionar evaluación"}
      </Link>
    </article>
  );
}
