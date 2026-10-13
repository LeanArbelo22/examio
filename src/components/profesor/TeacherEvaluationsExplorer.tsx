"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { useGetEvaluacionesDocente } from "@/hooks/useEvaluaciones";
import { groupTeacherEvaluations } from "@/lib/teacher-evaluations";
import { TeacherActivityCard } from "./TeacherActivityCard";
import { TeacherCommissionCard } from "./TeacherCommissionCard";
import { TeacherQuickActions } from "./TeacherQuickActions";
import { TeacherSubjectCard } from "./TeacherSubjectCard";

type ExplorerSelection =
  | { view: "subjects" }
  | { view: "subject"; idMateria: number }
  | { view: "commission"; idMateria: number; idMateriaDivision: number };

function SectionHeading({
  title,
  description,
  count,
  onBack,
  backLabel,
}: {
  title: string;
  description?: string;
  count: string;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <span aria-hidden="true">←</span>
            {backLabel ?? "Volver"}
          </button>
        )}
        <span className="w-fit rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
          {count}
        </span>
      </div>
    </header>
  );
}

function ActivitiesGrid({
  evaluations,
}: {
  evaluations: ReturnType<typeof groupTeacherEvaluations>[number]["evaluaciones"];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {evaluations.map((evaluacion) => (
        <TeacherActivityCard key={evaluacion.idPublicacion} evaluacion={evaluacion} />
      ))}
    </div>
  );
}

export function TeacherEvaluationsExplorer() {
  const [selection, setSelection] = useState<ExplorerSelection>({ view: "subjects" });
  const { data: session, status: sessionStatus } = useSession();
  const legajo = Number(session?.user?.identificadorInstitucional) || 0;
  const query = useGetEvaluacionesDocente(legajo);
  const materias = groupTeacherEvaluations(query.data ?? []);

  let content;

  if (sessionStatus === "loading" || query.isLoading) {
    content = <LoadingState message="Cargando actividades asignadas..." />;
  } else if (query.isError) {
    content = (
      <RequestErrorState
        error={query.error}
        fallback="No pudimos cargar tus actividades."
        onRetry={() => void query.refetch()}
        showRetry
      />
    );
  } else if (selection.view === "subjects") {
    content = (
      <>
        <SectionHeading
          title="Mis materias"
          description="Seleccioná una materia para ver sus comisiones y actividades."
          count={`${materias.length} materia${materias.length !== 1 ? "s" : ""}`}
        />

        {materias.length === 0 ? (
          <EmptyState
            title="No tenés actividades publicadas"
            description="Cuando tengas actividades asignadas, aparecerán agrupadas por materia."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {materias.map((materia) => (
              <TeacherSubjectCard
                key={materia.idMateria}
                materia={materia}
                onSelect={() =>
                  setSelection({ view: "subject", idMateria: materia.idMateria })
                }
              />
            ))}
          </div>
        )}
      </>
    );
  } else {
    const materia = materias.find((item) => item.idMateria === selection.idMateria);

    if (!materia) {
      content = (
        <>
          <EmptyState
            title="No encontramos esta materia"
            description="Puede que ya no tenga actividades asignadas o que no pertenezca a tus comisiones."
          />
          <button
            type="button"
            onClick={() => setSelection({ view: "subjects" })}
            className="w-fit text-sm font-semibold text-indigo-700 hover:text-indigo-900"
          >
            Volver a mis materias
          </button>
        </>
      );
    } else if (selection.view === "subject" && materia.comisiones.length > 1) {
      content = (
        <>
          <SectionHeading
            title={materia.materia}
            description={`${materia.carrera} · Seleccioná una comisión para ver sus actividades.`}
            count={`${materia.comisiones.length} comisiones`}
            onBack={() => setSelection({ view: "subjects" })}
            backLabel="Volver a materias"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {materia.comisiones.map((comision) => (
              <TeacherCommissionCard
                key={comision.idMateriaDivision}
                comision={comision}
                onSelect={() =>
                  setSelection({
                    view: "commission",
                    idMateria: materia.idMateria,
                    idMateriaDivision: comision.idMateriaDivision,
                  })
                }
              />
            ))}
          </div>
        </>
      );
    } else {
      const comision =
        selection.view === "commission"
          ? materia.comisiones.find(
              (item) => item.idMateriaDivision === selection.idMateriaDivision,
            )
          : materia.comisiones[0];

      if (!comision) {
        content = (
          <>
            <EmptyState
              title="No encontramos esta comisión"
              description="Puede que ya no tenga actividades asignadas o que no pertenezca a esta materia."
            />
            <button
              type="button"
              onClick={() =>
                setSelection({ view: "subject", idMateria: materia.idMateria })
              }
              className="w-fit text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            >
              Volver a {materia.materia}
            </button>
          </>
        );
      } else {
        content = (
          <>
            <SectionHeading
              title={materia.materia}
              description={`${materia.carrera} · Comisión ${comision.division}`}
              count={`${comision.evaluaciones.length} actividad${comision.evaluaciones.length !== 1 ? "es" : ""}`}
              onBack={() =>
                setSelection(
                  materia.comisiones.length > 1
                    ? { view: "subject", idMateria: materia.idMateria }
                    : { view: "subjects" },
                )
              }
              backLabel={
                materia.comisiones.length > 1
                  ? "Volver a comisiones"
                  : "Volver a materias"
              }
            />
            <ActivitiesGrid evaluations={comision.evaluaciones} />
          </>
        );
      }
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 antialiased">
      <TeacherQuickActions />
      {content}
    </div>
  );
}
