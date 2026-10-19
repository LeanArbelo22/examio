"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import {
  useIncidentesPublicacion,
  useRevisarIncidente,
} from "@/hooks/useIncidentes";
import { getUserErrorMessage } from "@/lib/errors";
import { ApiError } from "@/lib/api";
import type {
  EstadoRevisionIncidente,
  FiltrosIncidentesPublicacion,
  IncidentePublicacion,
  SeveridadIncidente,
} from "@/types";

const INCIDENT_LABELS: Record<string, string> = {
  focus_lost: "Pérdida de foco",
  fullscreen_exit: "Salida de pantalla completa",
  connectivity_lost: "Pérdida de conexión",
  auth_session_unavailable: "Sesión no disponible",
  sync_error: "Error de sincronización",
  submission_failed: "Entrega fallida",
};

const SEVERITY_LABELS: Record<SeveridadIncidente, string> = {
  sin_clasificar: "Sin clasificación",
  informar: "Informativo",
  advertir: "Advertencia",
  bloquear_interfaz: "Bloqueo temporal",
  anular_intento: "Anulación del intento",
};

const SEVERITY_TONES: Record<SeveridadIncidente, StatusBadgeTone> = {
  sin_clasificar: "neutral",
  informar: "info",
  advertir: "warning",
  bloquear_interfaz: "danger",
  anular_intento: "danger",
};

const REVIEW_LABELS: Record<EstadoRevisionIncidente, string> = {
  pendiente: "Pendiente de revisión",
  revisado: "Revisado",
  descartado: "Descartado",
};

const REVIEW_TONES: Record<EstadoRevisionIncidente, StatusBadgeTone> = {
  pendiente: "warning",
  revisado: "success",
  descartado: "neutral",
};

interface DraftFilters {
  tipoIncidente: string;
  severidad: SeveridadIncidente | "";
  estadoRevision: EstadoRevisionIncidente | "";
  soloIncidentesSinRevisar: boolean;
}

const EMPTY_FILTERS: DraftFilters = {
  tipoIncidente: "",
  severidad: "",
  estadoRevision: "",
  soloIncidentesSinRevisar: false,
};

interface ReviewDraft {
  incidente: IncidentePublicacion;
  estado: EstadoRevisionIncidente;
  comentario: string;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function formatDuration(value: number | null) {
  if (value === null) return "Duración no disponible";
  if (value < 1_000) return `${Math.round(value)} ms`;
  const seconds = value / 1_000;
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)} s`;
}

export function EvaluationIncidentsPanel({
  idPublicacion,
}: {
  idPublicacion: number;
}) {
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<FiltrosIncidentesPublicacion>({
    pagina: 1,
    limite: 10,
  });
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const query = useIncidentesPublicacion(idPublicacion, filters);
  const reviewMutation = useRevisarIncidente(idPublicacion);
  const idempotency = useIdempotencyKey();

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({
      tipoIncidente: draftFilters.tipoIncidente || undefined,
      severidad: draftFilters.severidad || undefined,
      estadoRevision: draftFilters.soloIncidentesSinRevisar
        ? undefined
        : draftFilters.estadoRevision || undefined,
      soloIncidentesSinRevisar:
        draftFilters.soloIncidentesSinRevisar || undefined,
      pagina: 1,
      limite: 10,
    });
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters({ pagina: 1, limite: 10 });
  };

  const saveReview = async () => {
    if (!reviewDraft) return;
    const payload = {
      Estado: reviewDraft.estado,
      RevisionEsperada: reviewDraft.incidente.revision,
      Comentario: reviewDraft.comentario.trim() || null,
    };
    const intention = {
      idIntento: reviewDraft.incidente.idIntento,
      eventoId: reviewDraft.incidente.eventoId,
      payload,
    };
    try {
      await reviewMutation.mutateAsync({
        ...intention,
        idempotencyKey: idempotency.keyFor(intention),
      });
      idempotency.complete();
      setSuccessMessage(
        reviewDraft.estado === "descartado"
          ? "El incidente quedó descartado para el seguimiento operativo. Su registro se conserva."
          : reviewDraft.estado === "pendiente"
            ? "El incidente volvió a quedar pendiente de revisión operativa."
            : "La revisión operativa quedó registrada.",
      );
      setReviewDraft(null);
    } catch {
      // La mutación conserva el error y la intención idempotente para reconciliar o reintentar.
    }
  };

  const reloadConflictedReview = async () => {
    if (!reviewDraft) return;
    const result = await query.refetch();
    const current = result.data?.incidentes.find(
      (incidente) => incidente.idIncidente === reviewDraft.incidente.idIncidente,
    );
    if (current) {
      setReviewDraft((draft) =>
        draft ? { ...draft, incidente: current } : draft,
      );
      reviewMutation.reset();
    }
  };

  if (query.isLoading) {
    return <LoadingState message="Cargando incidentes de la evaluación..." />;
  }

  if (query.isError || !query.data) {
    return (
      <RequestErrorState
        error={query.error}
        fallback="No se pudieron cargar los incidentes de la evaluación."
        onRetry={() => void query.refetch()}
        showRetry
      />
    );
  }

  const { resumen, incidentes, paginacion } = query.data;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-labelledby="evaluation-incidents-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="evaluation-incidents-title"
            className="text-lg font-black text-slate-900"
          >
            Incidentes de la evaluación
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Son señales operativas para revisar. Un incidente pendiente no implica fraude ni modifica la nota.
          </p>
        </div>
        {resumen.incidentesSinRevisar > 0 && (
          <StatusBadge
            label={`${resumen.incidentesSinRevisar} pendientes`}
            tone="warning"
          />
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Incidentes" value={resumen.totalIncidentes} />
        <Metric label="Alumnos afectados" value={resumen.alumnosConIncidentes} />
        <Metric label="Intentos anulados" value={resumen.intentosAnulados} />
        <Metric label="Pendientes de revisión" value={resumen.incidentesSinRevisar} />
      </dl>

      <details className="mt-4 rounded-xl border border-slate-200 p-4">
        <summary className="cursor-pointer text-sm font-bold text-slate-800">
          Ver y revisar incidentes
        </summary>

        <form
          onSubmit={applyFilters}
          className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <SelectField
            label="Tipo de incidente"
            value={draftFilters.tipoIncidente}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, tipoIncidente: value }))
            }
            options={Object.entries(INCIDENT_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <SelectField
            label="Consecuencia"
            value={draftFilters.severidad}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                severidad: value as SeveridadIncidente | "",
              }))
            }
            options={Object.entries(SEVERITY_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <SelectField
            label="Estado de revisión"
            value={draftFilters.estadoRevision}
            disabled={draftFilters.soloIncidentesSinRevisar}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                estadoRevision: value as EstadoRevisionIncidente | "",
              }))
            }
            options={Object.entries(REVIEW_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <label className="flex items-end gap-2 pb-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={draftFilters.soloIncidentesSinRevisar}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  soloIncidentesSinRevisar: event.target.checked,
                }))
              }
              className="h-4 w-4 accent-indigo-600"
            />
            Mostrar sólo pendientes
          </label>
          <div className="flex gap-2 md:col-span-2 xl:col-span-4 xl:justify-end">
            <Button
              type="button"
              onClick={clearFilters}
              className="border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            >
              Limpiar
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
            >
              Aplicar filtros
            </Button>
          </div>
        </form>

        {successMessage && (
          <div className="mt-4">
            <FeedbackMessage variant="success" message={successMessage} />
          </div>
        )}
        {reviewMutation.isError && (
          <div className="mt-4">
            <FeedbackMessage
              variant="error"
              message={getUserErrorMessage(
                reviewMutation.error,
                "No se pudo actualizar la revisión operativa.",
              )}
              action={
                reviewMutation.error instanceof ApiError &&
                reviewMutation.error.code === "INCIDENT_REVISION_CONFLICT" ? (
                  <Button
                    type="button"
                    onClick={() => void reloadConflictedReview()}
                    className="shrink-0 border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-800"
                  >
                    Recargar estado
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}

        {incidentes.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No hay incidentes para estos filtros"
              description="Los eventos operativos normales no se incluyen en este listado."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3" aria-busy={query.isFetching}>
            {incidentes.map((incidente) => (
              <li
                key={incidente.idIncidente}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-900">
                        {INCIDENT_LABELS[incidente.tipo] ?? incidente.tipo}
                      </p>
                      <StatusBadge
                        label={SEVERITY_LABELS[incidente.severidad]}
                        tone={SEVERITY_TONES[incidente.severidad]}
                      />
                      <StatusBadge
                        label={REVIEW_LABELS[incidente.estadoRevision]}
                        tone={REVIEW_TONES[incidente.estadoRevision]}
                      />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {incidente.alumnoApellido}, {incidente.alumnoNombre} · Intento {incidente.numeroIntento}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(incidente.fechaInicioCliente)} · {formatDuration(incidente.duracionMilisegundos)}
                    </p>
                    {incidente.fechaRevision && (
                      <p className="mt-1 text-xs text-slate-500">
                        Última revisión: {formatDate(incidente.fechaRevision)}
                        {incidente.actorRol ? ` · ${incidente.actorRol}` : ""}
                      </p>
                    )}
                    {incidente.comentario && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {incidente.comentario}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/profesor/intento/${incidente.idIntento}`}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      Ver intento
                    </Link>
                    <Button
                      type="button"
                      onClick={() => {
                        setSuccessMessage(null);
                        reviewMutation.reset();
                        setReviewDraft({
                          incidente,
                          estado:
                            incidente.estadoRevision === "pendiente"
                              ? "revisado"
                              : incidente.estadoRevision,
                          comentario: incidente.comentario ?? "",
                        });
                      }}
                      className="bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
                    >
                      Actualizar revisión
                    </Button>
                  </div>
                </div>

                {reviewDraft?.incidente.idIncidente === incidente.idIncidente && (
                  <div className="mt-4 grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 md:grid-cols-[220px_1fr]">
                    <SelectField
                      label="Resultado de la revisión"
                      value={reviewDraft.estado}
                      onChange={(value) =>
                        setReviewDraft((current) =>
                          current
                            ? {
                                ...current,
                                estado: value as EstadoRevisionIncidente,
                              }
                            : current,
                        )
                      }
                      options={Object.entries(REVIEW_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      includeAll={false}
                    />
                    <label className="text-xs font-bold text-slate-700">
                      Comentario opcional
                      <textarea
                        value={reviewDraft.comentario}
                        maxLength={500}
                        onChange={(event) =>
                          setReviewDraft((current) =>
                            current
                              ? { ...current, comentario: event.target.value }
                              : current,
                          )
                        }
                        className="mt-1.5 min-h-20 w-full rounded-lg border border-slate-300 bg-white p-2.5 font-normal"
                        placeholder="Contexto de la revisión operativa"
                      />
                    </label>
                    <p className="text-xs text-slate-600 md:col-span-2">
                      Esta clasificación no modifica la nota, el estado del intento ni la consecuencia aplicada.
                    </p>
                    <div className="flex justify-end gap-2 md:col-span-2">
                      <Button
                        type="button"
                        onClick={() => setReviewDraft(null)}
                        disabled={reviewMutation.isPending}
                        className="border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void saveReview()}
                        disabled={reviewMutation.isPending}
                        className="bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {reviewMutation.isPending ? "Guardando..." : "Guardar revisión"}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <Pagination
            page={paginacion.pagina}
            totalPages={paginacion.totalPaginas}
            total={paginacion.total}
            itemLabel="incidentes"
            onPageChange={(pagina) =>
              setFilters((current) => ({ ...current, pagina }))
            }
          />
        </div>
      </details>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-black text-slate-900">
        {value.toLocaleString("es-AR")}
      </dd>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
  includeAll = true,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  includeAll?: boolean;
}) {
  return (
    <label className="text-xs font-bold text-slate-700">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal disabled:bg-slate-100 disabled:text-slate-400"
      >
        {includeAll && <option value="">Todos</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
