"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { EvaluationReportCharts } from "@/components/reports/EvaluationReportCharts";
import { QuestionOptionsDetail } from "@/components/reports/QuestionOptionsDetail";
import { ReportKpiGrid } from "@/components/reports/ReportKpiGrid";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { useGetEvaluacionesDocente } from "@/hooks/useEvaluaciones";
import {
  useReporteRendimientoEvaluaciones,
  useReporteRendimientoGrupos,
  useReporteRendimientoPreguntas,
} from "@/hooks/useReportes";
import type {
  EvaluacionDocente,
  OrdenDireccion,
  ReportePreguntaItem,
  ReportePreguntasOrden,
} from "@/types";

const OFFICIAL_SCOPE = {
  alcanceIntentos: "validos" as const,
  estadoCorreccion: "confirmada" as const,
};

function percentage(value: number | null) {
  return value === null
    ? "Sin datos"
    : `${value.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`;
}

function duration(milliseconds: number | null) {
  if (milliseconds === null) return "Sin datos";
  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toLocaleString("es-AR", { maximumFractionDigits: 1 })} s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return remainder ? `${minutes} min ${remainder} s` : `${minutes} min`;
}

function publicationDate(value: string) {
  const date = new Date(value);
  return {
    day: date.toLocaleDateString("es-AR", { day: "2-digit" }),
    month: date.toLocaleDateString("es-AR", { month: "short" }).replace(".", ""),
  };
}

function uniqueBy<T>(items: T[], getId: (item: T) => number) {
  return [...new Map(items.map((item) => [getId(item), item])).values()];
}

function PublicationSelector({
  evaluations,
  initialFilters,
  onSelect,
}: {
  evaluations: EvaluacionDocente[];
  initialFilters: {
    idMateria: string;
    idMateriaDivision: string;
    idActividad: string;
  };
  onSelect: (evaluation: EvaluacionDocente, filters: typeof initialFilters) => void;
}) {
  const [idMateria, setIdMateria] = useState(initialFilters.idMateria);
  const [idMateriaDivision, setIdMateriaDivision] = useState(
    initialFilters.idMateriaDivision,
  );
  const [idActividad, setIdActividad] = useState(initialFilters.idActividad);

  const subjects = useMemo(
    () => uniqueBy(evaluations, (item) => item.idMateria),
    [evaluations],
  );
  const commissions = useMemo(
    () =>
      uniqueBy(
        evaluations.filter(
          (item) => !idMateria || item.idMateria === Number(idMateria),
        ),
        (item) => item.idMateriaDivision,
      ),
    [evaluations, idMateria],
  );
  const activities = useMemo(
    () =>
      uniqueBy(
        evaluations.filter(
          (item) =>
            (!idMateria || item.idMateria === Number(idMateria)) &&
            (!idMateriaDivision ||
              item.idMateriaDivision === Number(idMateriaDivision)),
        ),
        (item) => item.idActividad,
      ),
    [evaluations, idMateria, idMateriaDivision],
  );
  const publications = useMemo(
    () =>
      evaluations.filter(
        (item) =>
          (!idMateria || item.idMateria === Number(idMateria)) &&
          (!idMateriaDivision ||
            item.idMateriaDivision === Number(idMateriaDivision)) &&
          (!idActividad || item.idActividad === Number(idActividad)),
      ),
    [evaluations, idActividad, idMateria, idMateriaDivision],
  );

  const selectClass =
    "h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-black text-slate-900">Seleccioná una publicación</h2>
        <p className="mt-1 text-sm text-slate-500">
          Elegí la materia, la comisión y la evaluación que querés analizar.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-600">
          Materia
          <select
            aria-label="Materia del análisis"
            className={selectClass}
            value={idMateria}
            onChange={(event) => {
              setIdMateria(event.target.value);
              setIdMateriaDivision("");
              setIdActividad("");
            }}
          >
            <option value="">Todas mis materias</option>
            {subjects.map((item) => (
              <option key={item.idMateria} value={item.idMateria}>
                {item.materia}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-600">
          Comisión
          <select
            aria-label="Comisión del análisis"
            className={selectClass}
            value={idMateriaDivision}
            disabled={commissions.length === 0}
            onChange={(event) => {
              setIdMateriaDivision(event.target.value);
              setIdActividad("");
            }}
          >
            <option value="">Todas las comisiones disponibles</option>
            {commissions.map((item) => (
              <option key={item.idMateriaDivision} value={item.idMateriaDivision}>
                {item.materia} · {item.division}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-600">
          Evaluación
          <select
            aria-label="Evaluación del análisis"
            className={selectClass}
            value={idActividad}
            disabled={activities.length === 0}
            onChange={(event) => setIdActividad(event.target.value)}
          >
            <option value="">Todas las evaluaciones disponibles</option>
            {activities.map((item) => (
              <option key={item.idActividad} value={item.idActividad}>
                {item.titulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      {publications.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No hay publicaciones disponibles"
            description="Probá con una materia o comisión diferente."
          />
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-800">
              Publicaciones disponibles
            </h3>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              {publications.length} {publications.length === 1 ? "resultado" : "resultados"}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2" role="list">
            {publications.map((evaluation) => {
              const date = publicationDate(evaluation.fechaInicio);
              return (
                <article
                  key={evaluation.idPublicacion}
                  role="listitem"
                  className="group flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50/70 sm:flex-row sm:items-center"
                >
                  <time
                    dateTime={evaluation.fechaInicio}
                    className="flex shrink-0 items-baseline gap-1 text-slate-600 sm:w-20 sm:flex-col sm:items-center sm:gap-0 sm:rounded-xl sm:bg-slate-50 sm:px-3 sm:py-2"
                  >
                    <span className="text-xl font-black leading-none text-slate-900">
                      {date.day}
                    </span>
                    <span className="text-xs font-bold uppercase text-indigo-600">
                      {date.month}
                    </span>
                  </time>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-base font-black text-slate-900">
                      {evaluation.titulo}
                    </h4>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {evaluation.materia} · {evaluation.division}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{evaluation.duracionMinutos} min</span>
                      <span>
                        {evaluation.cantidadIntentosMaximos}{" "}
                        {evaluation.cantidadIntentosMaximos === 1 ? "intento" : "intentos"}
                      </span>
                      <span>
                        {evaluation.alumnosInscriptos}{" "}
                        {evaluation.alumnosInscriptos === 1 ? "estudiante" : "estudiantes"}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() =>
                      onSelect(evaluation, {
                        idMateria: String(evaluation.idMateria),
                        idMateriaDivision: String(evaluation.idMateriaDivision),
                        idActividad: String(evaluation.idActividad),
                      })
                    }
                    className="w-full shrink-0 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 sm:w-auto"
                  >
                    Ver análisis <span aria-hidden="true">→</span>
                  </Button>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export function TeacherPublicationAnalysis() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const legajo = Number(session?.user?.identificadorInstitucional) || 0;
  const evaluationsQuery = useGetEvaluacionesDocente(legajo);
  const evaluations = evaluationsQuery.data ?? [];
  const idPublicacion = Number(searchParams.get("idPublicacion")) || 0;
  const step = searchParams.get("analisisPaso") === "preguntas" ? "preguntas" : "resumen";
  const [selectedQuestion, setSelectedQuestion] = useState<ReportePreguntaItem | null>(null);

  const selectedEvaluation = evaluations.find(
    (item) => item.idPublicacion === idPublicacion,
  );
  const summaryQuery = useReporteRendimientoEvaluaciones(
    {
      idPublicacion: idPublicacion ? String(idPublicacion) : undefined,
      alcanceIntentos: "todos",
      pagina: 1,
      limite: 1,
    },
    idPublicacion > 0,
  );

  const questionPage = Math.max(1, Number(searchParams.get("preguntasPagina")) || 1);
  const questionSort =
    (searchParams.get("preguntasOrden") as ReportePreguntasOrden) ||
    "porcentajePuntaje";
  const questionDirection =
    (searchParams.get("preguntasDireccion") as OrdenDireccion) || "asc";
  const baseQuestionFilters = {
    idPublicacion: idPublicacion ? String(idPublicacion) : undefined,
    ...OFFICIAL_SCOPE,
  };
  const rankingQuery = useReporteRendimientoPreguntas(
    {
      ...baseQuestionFilters,
      soloHallazgosBajoRendimiento: true,
      ordenarPor: "porcentajePuntaje",
      ordenDireccion: "asc",
      pagina: 1,
      limite: 10,
    },
    idPublicacion > 0 && step === "preguntas",
  );
  const questionsQuery = useReporteRendimientoPreguntas(
    {
      ...baseQuestionFilters,
      ordenarPor: questionSort,
      ordenDireccion: questionDirection,
      pagina: questionPage,
      limite: 20,
    },
    idPublicacion > 0 && step === "preguntas",
  );
  const groupQuery = useReporteRendimientoGrupos(
    {
      ...baseQuestionFilters,
      idGrupoPregunta: selectedQuestion
        ? String(selectedQuestion.idGrupoPregunta)
        : undefined,
      ordenarPor: "grupo",
      ordenDireccion: "asc",
      pagina: 1,
      limite: 100,
    },
    selectedQuestion !== null,
  );

  const replaceParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("reporte", "analisis");
    mutate(params);
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  const selectPublication = (
    evaluation: EvaluacionDocente,
    filters: { idMateria: string; idMateriaDivision: string; idActividad: string },
  ) => {
    replaceParams((params) => {
      params.set("analisisMateria", filters.idMateria);
      params.set("analisisComision", filters.idMateriaDivision);
      params.set("analisisActividad", filters.idActividad);
      params.set("idPublicacion", String(evaluation.idPublicacion));
      params.set("analisisPaso", "resumen");
      params.delete("preguntasPagina");
      params.delete("preguntasOrden");
      params.delete("preguntasDireccion");
      params.delete("fechaDesde");
      params.delete("fechaHasta");
    });
  };

  const returnToSelection = () => {
    setSelectedQuestion(null);
    replaceParams((params) => {
      params.delete("idPublicacion");
      params.delete("analisisPaso");
      params.delete("preguntasPagina");
      params.delete("preguntasOrden");
      params.delete("preguntasDireccion");
    });
  };

  const questionColumns = useMemo<
    ReportColumn<ReportePreguntaItem, ReportePreguntasOrden>[]
  >(
    () => [
      {
        key: "pregunta",
        header: "Pregunta",
        sortKey: "pregunta",
        render: (row) => (
          <div className="max-w-md">
            <p className="font-bold text-slate-800">{row.enunciado}</p>
            <p className="mt-1 text-[10px] text-slate-500">
              {row.grupo || "Grupo sin título"} · {row.presentacionesOficiales} presentaciones oficiales
            </p>
          </div>
        ),
      },
      {
        key: "muestra",
        header: "Respuestas calificadas",
        align: "center",
        render: (row) => row.muestrasConfirmadas.toLocaleString("es-AR"),
      },
      {
        key: "puntaje",
        header: "Puntaje promedio",
        align: "right",
        sortKey: "porcentajePuntaje",
        render: (row) => percentage(row.porcentajePuntajePromedio),
      },
      {
        key: "tiempo",
        header: "Tiempo mediano",
        align: "right",
        sortKey: "tiempoPromedio",
        render: (row) => duration(row.tiempoMedianaMilisegundos),
      },
      {
        key: "estado",
        header: "Revisión",
        align: "right",
        render: (row) =>
          row.hallazgoBajoRendimiento.detectado ? (
            <span className="rounded-full bg-rose-50 px-2 py-1 font-bold text-rose-700">
              Merece revisión
            </span>
          ) : row.muestrasConfirmadas < 10 ? (
            <span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-800">
              Evidencia insuficiente
            </span>
          ) : (
            <span className="font-medium text-emerald-700">No requiere revisión</span>
          ),
      },
    ],
    [],
  );

  if (evaluationsQuery.isLoading) {
    return <LoadingState message="Cargando publicaciones autorizadas…" />;
  }
  if (evaluationsQuery.isError) {
    return (
      <RequestErrorState
        error={evaluationsQuery.error}
        fallback="No se pudieron cargar tus publicaciones."
        onRetry={() => void evaluationsQuery.refetch()}
      />
    );
  }

  if (!idPublicacion) {
    return (
      <ReportLayout
        title="Análisis de una evaluación"
        description="Revisá los resultados de una evaluación y detectá preguntas que podrían necesitar atención."
      >
        <PublicationSelector
          evaluations={evaluations}
          initialFilters={{
            idMateria: searchParams.get("analisisMateria") ?? "",
            idMateriaDivision: searchParams.get("analisisComision") ?? "",
            idActividad: searchParams.get("analisisActividad") ?? "",
          }}
          onSelect={selectPublication}
        />
      </ReportLayout>
    );
  }

  if (!selectedEvaluation) {
    return (
      <ReportLayout
        title="Publicación no disponible"
        description="La publicación solicitada no forma parte de tus evaluaciones autorizadas."
      >
        <FeedbackMessage
          variant="warning"
          message="Volvé al selector para elegir una publicación disponible."
          action={
            <Button type="button" onClick={returnToSelection} className="rounded-lg bg-amber-900 px-3 py-2 text-xs font-bold text-white">
              Volver
            </Button>
          }
        />
      </ReportLayout>
    );
  }

  const summary = summaryQuery.isPlaceholderData
    ? undefined
    : summaryQuery.data?.evaluaciones[0];
  const official = summary?.resultadosOficiales;
  const operational = summary?.pendientesOperativos;
  const variants = groupQuery.isPlaceholderData
    ? []
    : groupQuery.data?.items[0]?.variantes ?? [];
  const rankingData = rankingQuery.isPlaceholderData
    ? undefined
    : rankingQuery.data;
  const questionsData = questionsQuery.isPlaceholderData
    ? undefined
    : questionsQuery.data;
  const evidenceSummary = rankingData?.resumenFiltro;
  const findingRule = rankingData?.reglaHallazgo;

  return (
    <ReportLayout
      title={selectedEvaluation.titulo}
      description={`${selectedEvaluation.materia} · ${selectedEvaluation.division}`}
      actions={
        <Button
          type="button"
          onClick={returnToSelection}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Volver a publicaciones
        </Button>
      }
    >
      <nav aria-label="Etapas del análisis" className="flex w-fit rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          aria-current={step === "resumen" ? "step" : undefined}
          onClick={() => replaceParams((params) => params.set("analisisPaso", "resumen"))}
          className={`rounded-lg px-4 py-2 text-xs font-bold ${step === "resumen" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
        >
          1. Resultados oficiales
        </button>
        <button
          type="button"
          aria-current={step === "preguntas" ? "step" : undefined}
          onClick={() =>
            replaceParams((params) => {
              params.set("analisisPaso", "preguntas");
              params.delete("fechaDesde");
              params.delete("fechaHasta");
            })
          }
          className={`rounded-lg px-4 py-2 text-xs font-bold ${step === "preguntas" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
        >
          2. Preguntas y evidencia
        </button>
      </nav>

      {step === "resumen" && (
        <>
          {(summaryQuery.isLoading || summaryQuery.isPlaceholderData) && (
            <ReportSkeleton />
          )}
          {summaryQuery.isError && (
            <RequestErrorState
              error={summaryQuery.error}
              fallback="No se pudo cargar el resumen de la publicación."
              onRetry={() => void summaryQuery.refetch()}
            />
          )}
          {summaryQuery.data && !summary && !summaryQuery.isPlaceholderData && (
            <FeedbackMessage
              variant="warning"
              message="No pudimos cargar los resultados de esta evaluación. Volvé a intentarlo más tarde."
            />
          )}
          {summary && (!official || !operational) && (
            <FeedbackMessage
              variant="warning"
              message="El resumen de resultados no está disponible en este momento."
            />
          )}
          {official && operational && summary && (
            <div className="space-y-6">
              <section aria-labelledby="official-results-title">
                <div className="mb-3">
                  <h2 id="official-results-title" className="text-lg font-black text-slate-900">Resultados oficiales</h2>
                  <p className="text-sm text-slate-500">Sólo intentos válidos entregados, con corrección confirmada y nota final.</p>
                </div>
                <ReportKpiGrid
                  items={[
                    { label: "Resultados considerados", value: official.resultadosConsiderados.toLocaleString("es-AR"), helper: `${official.intentosValidosEntregados} intentos válidos entregados`, tone: "indigo" },
                    { label: "Resultados pendientes", value: official.resultadosPendientes.toLocaleString("es-AR"), helper: "Requieren completar o confirmar la corrección", tone: "amber" },
                    { label: "Aprobación confirmada", value: percentage(official.porcentajeAprobacion), helper: `${official.aprobados} aprobados · ${official.desaprobados} desaprobados`, tone: "emerald" },
                    { label: "Resultados listos", value: percentage(official.porcentajeCoberturaConfirmada), helper: `${official.resultadosConsiderados} de ${official.intentosValidosEntregados} intentos válidos tienen corrección y nota final`, tone: "blue" },
                  ]}
                />
              </section>

              <section aria-labelledby="operational-pending-title" className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                <h2 id="operational-pending-title" className="text-base font-black text-slate-900">Pendientes operativos</h2>
                <p className="mt-1 text-sm text-slate-600">Incluyen todos los intentos entregados, sean válidos o no. Las subcategorías se superponen y no deben sumarse.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    ["Intentos pendientes", operational.intentosEntregadosPendientes],
                    ["Sin confirmar", operational.intentosPendientesConfirmacion],
                    ["Sin nota final", operational.intentosSinNotaFinal],
                    ["Con preguntas sin puntaje", operational.intentosConPreguntasSinPuntaje],
                    ["Preguntas sin puntaje", operational.preguntasSinPuntaje],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-amber-100 bg-white p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
                      <p className="mt-1 text-xl font-black text-slate-900">{Number(value).toLocaleString("es-AR")}</p>
                    </div>
                  ))}
                </div>
              </section>

              <details className="rounded-2xl border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer text-sm font-bold text-slate-800">Ver distribución de todos los intentos</summary>
                <p className="mt-2 text-xs text-slate-500">Incluye todos los intentos y puede diferir de los resultados oficiales.</p>
                <div className="mt-4">
                  <EvaluationReportCharts
                    distribution={summaryQuery.data?.graficos.distribucionResultados ?? []}
                    participation={{
                      alcanzados: summary.alumnosAlcanzados,
                      iniciaron: summary.alumnosQueIniciaron,
                      entregaron: summary.entregados,
                    }}
                  />
                </div>
              </details>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() =>
                    replaceParams((params) => {
                      params.set("analisisPaso", "preguntas");
                      params.delete("fechaDesde");
                      params.delete("fechaHasta");
                    })
                  }
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  Revisar preguntas
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {step === "preguntas" && (
        <div className="space-y-6">
          {(rankingQuery.isLoading ||
            rankingQuery.isPlaceholderData ||
            questionsQuery.isLoading ||
            questionsQuery.isPlaceholderData) && <ReportSkeleton />}
          {rankingQuery.isError && (
            <RequestErrorState
              error={rankingQuery.error}
              fallback="No se pudieron identificar las preguntas que merecen revisión."
              onRetry={() => void rankingQuery.refetch()}
            />
          )}
          {questionsQuery.isError && (
            <RequestErrorState
              error={questionsQuery.error}
              fallback="No se pudo cargar la tabla de preguntas."
              onRetry={() => void questionsQuery.refetch()}
            />
          )}

          {rankingData && (!evidenceSummary || !findingRule) && (
            <FeedbackMessage
              variant="warning"
              message="No pudimos identificar qué preguntas necesitan revisión. La lista completa sigue disponible."
            />
          )}

          {evidenceSummary && findingRule && (
            <section aria-labelledby="finding-summary-title" className="space-y-3">
              <div>
                <h2 id="finding-summary-title" className="text-lg font-black text-slate-900">Preguntas que merecen revisión</h2>
                <p className="text-sm text-slate-500">Se destacan las preguntas con menos de {findingRule.porcentajePuntajeMaximoExclusivo}% de puntaje promedio y al menos {findingRule.muestrasConfirmadasMinimas} respuestas calificadas.</p>
              </div>
              {evidenceSummary.preguntasEnCoberturaGeneral === 0 && (
                <FeedbackMessage variant="info" message="No hay presentaciones oficiales para analizar en esta publicación." />
              )}
              {evidenceSummary.preguntasConMuestraInsuficiente > 0 && (
                <FeedbackMessage variant="warning" message={`${evidenceSummary.preguntasConMuestraInsuficiente} pregunta(s) tienen evidencia insuficiente. Los hallazgos no representan toda la evaluación.`} />
              )}
              {evidenceSummary.preguntasConMuestraSuficiente > 0 && evidenceSummary.preguntasCoincidentes === 0 && (
                <FeedbackMessage variant="success" message="No se detectaron hallazgos entre las preguntas con evidencia suficiente." />
              )}
              {evidenceSummary.preguntasCoincidentes > 0 && (
                <FeedbackMessage variant="info" message={`Se detectaron ${evidenceSummary.preguntasCoincidentes} pregunta(s) que cumplen el criterio de revisión.`} />
              )}
              <p className="text-xs text-slate-500">Los porcentajes se muestran redondeados. Por eso, un 30,00% visible puede estar apenas por debajo del límite.</p>
            </section>
          )}

          {rankingData && rankingData.items.length > 0 && (
            <section aria-labelledby="finding-ranking-title">
              <div className="mb-3">
                <h2 id="finding-ranking-title" className="text-base font-black text-slate-900">Preguntas prioritarias para revisar</h2>
                <p className="text-xs text-slate-500">Ordenadas desde el menor puntaje promedio. Sólo aparecen preguntas con al menos {findingRule?.muestrasConfirmadasMinimas ?? 10} respuestas calificadas.</p>
              </div>
              <ol className="grid gap-3 lg:grid-cols-2">
                {rankingData.items.map((question, index) => (
                  <li key={question.claveContenido}>
                    <button
                      type="button"
                      onClick={() => setSelectedQuestion(question)}
                      className="flex h-full w-full items-start gap-3 rounded-xl border border-rose-200 bg-white p-4 text-left hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-black text-rose-700">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="mb-2 inline-flex rounded-full bg-rose-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-rose-700">
                          Puntaje promedio bajo
                        </span>
                        <span className="block font-bold text-slate-900">{question.enunciado}</span>
                        <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span><strong className="text-slate-900">{percentage(question.porcentajePuntajePromedio)}</strong> del puntaje disponible</span>
                          <span><strong className="text-slate-900">{question.muestrasConfirmadas}</strong> respuestas calificadas</span>
                          {question.grupo && <span>{question.grupo}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {questionsData && (
            <section aria-labelledby="question-table-title">
              <div className="mb-3">
                <h2 id="question-table-title" className="text-base font-black text-slate-900">Todas las preguntas con evidencia oficial</h2>
                <p className="text-xs text-slate-500">Seleccioná una pregunta para consultar sus opciones y compararla con las variantes del mismo grupo.</p>
              </div>
              <ReportTable
                columns={questionColumns}
                rows={questionsData.items}
                rowKey={(row) => row.claveContenido}
                sortBy={questionSort}
                sortDirection={questionDirection}
                onSort={(sortBy, direction) =>
                  replaceParams((params) => {
                    params.set("preguntasOrden", sortBy);
                    params.set("preguntasDireccion", direction);
                    params.delete("preguntasPagina");
                  })
                }
                onRowClick={setSelectedQuestion}
                page={questionsData.pagination.page}
                totalPages={questionsData.pagination.totalPages}
                total={questionsData.pagination.total}
                itemLabel="preguntas"
                emptyMessage="No hay preguntas con presentaciones oficiales para esta publicación."
                onPageChange={(page) =>
                  replaceParams((params) => params.set("preguntasPagina", String(page)))
                }
              />
            </section>
          )}
        </div>
      )}

      <QuestionOptionsDetail
        question={selectedQuestion}
        filters={{
          idPublicacion: String(idPublicacion),
          ...OFFICIAL_SCOPE,
        }}
        variants={variants}
        onClose={() => setSelectedQuestion(null)}
      />
    </ReportLayout>
  );
}
