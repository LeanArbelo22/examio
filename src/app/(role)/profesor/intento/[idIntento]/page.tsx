"use client";

import { use } from "react";
import Link from "next/link";
import { FinalGradeOverride } from "@/components/evaluaciones/FinalGradeOverride";
import { QuestionCorrectionCard } from "@/components/evaluaciones/QuestionCorrectionCard";
import { AttemptFocusTelemetry } from "@/components/evaluaciones/AttemptFocusTelemetry";
import { CorrectionConfirmation } from "@/components/evaluaciones/CorrectionConfirmation";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { useGetIntentoCompleto } from "@/hooks/useEvaluaciones";
import { formatGrade } from "@/lib/attempt-grading";

function GradeMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

export default function AttemptCorrectionPage({ params }: { params: Promise<{ idIntento: string }> }) {
  const { idIntento } = use(params);
  const attemptId = Number(idIntento);
  const query = useGetIntentoCompleto(attemptId);

  if (!Number.isInteger(attemptId) || attemptId <= 0) {
    return <FeedbackMessage variant="error" message="El identificador del intento no es válido." />;
  }
  if (query.isLoading) return <LoadingState message="Cargando corrección del examen..." />;
  if (query.isError) {
    return (
      <RequestErrorState
        error={query.error}
        fallback="No se pudo cargar el intento."
        onRetry={() => void query.refetch()}
        showRetry
      />
    );
  }

  const attempt = query.data;
  if (!attempt) return <FeedbackMessage variant="error" message="No se encontró el intento." />;

  const isDelivered = attempt.estado !== "en_progreso";
  const isPassed = attempt.notaFinal !== null && attempt.notaFinal >= attempt.notaAprobacion;
  const pendingCount = attempt.preguntas.filter((question) => question.puntajeObtenido === null).length;

  return (
    <main className="grid grid-cols-1 gap-6 antialiased">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Corrección del intento #{attempt.numeroIntento}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{attempt.apellido}, {attempt.nombre}</h1>
            <p className="mt-1 text-sm text-slate-600">{attempt.correo}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nota efectiva</p>
              <p className={`text-2xl font-black ${attempt.notaFinal === null ? "text-slate-400" : isPassed ? "text-emerald-700" : "text-red-600"}`}>
                {formatGrade(attempt.notaFinal, attempt.escalaCalificacion)}
              </p>
              <p className="text-xs text-slate-500">Aprueba con {formatGrade(attempt.notaAprobacion)}</p>
            </div>
            <Link
              href={`/profesor/examen/${attempt.idPublicacion}`}
              className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Volver al examen
            </Link>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm md:grid-cols-5">
          <div><dt className="text-xs font-semibold uppercase text-slate-500">Evaluación</dt><dd className="mt-1 font-bold text-slate-800">{attempt.tituloEvaluacion}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-slate-500">Estado</dt><dd className="mt-1 font-bold text-slate-800">{attempt.estado}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-slate-500">Duración</dt><dd className="mt-1 font-bold text-slate-800">{attempt.fechaFin ? `${Math.round((new Date(attempt.fechaFin).getTime() - new Date(attempt.fechaInicio).getTime()) / 60_000)} min` : "—"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-slate-500">Inicio</dt><dd className="mt-1 font-bold text-slate-800">{new Date(attempt.fechaInicio).toLocaleString("es-AR")}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-slate-500">Fin</dt><dd className="mt-1 font-bold text-slate-800">{attempt.fechaFin ? new Date(attempt.fechaFin).toLocaleString("es-AR") : "—"}</dd></div>
        </dl>
      </section>

      {!isDelivered && (
        <FeedbackMessage variant="warning" message="El intento todavía está en progreso. Podés revisar sus datos, pero la corrección se habilitará después de la entrega." />
      )}

      <section aria-labelledby="grade-breakdown-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="grade-breakdown-title" className="text-lg font-black text-slate-900">Desglose de calificación</h2>
            <p className="text-sm text-slate-600">Resumen de la corrección y de la nota final del intento.</p>
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {pendingCount === 0 ? "Todas las preguntas están corregidas" : `${pendingCount} ${pendingCount === 1 ? "pregunta pendiente" : "preguntas pendientes"}`}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <GradeMetric label="Automática" value={formatGrade(attempt.notaAutomatica, attempt.escalaCalificacion)} detail="Suma de componentes automáticos" />
          <GradeMetric label="Calculada" value={formatGrade(attempt.notaFinalCalculada, attempt.escalaCalificacion)} detail={attempt.notaFinalCalculada === null ? "Disponible al completar la corrección" : "Suma definitiva por pregunta"} />
          <GradeMetric label="Ajuste docente" value={formatGrade(attempt.notaFinalManual, attempt.escalaCalificacion)} detail={attempt.notaFinalManual === null ? "Sin modificaciones" : "Nota modificada por el docente"} />
          <GradeMetric label="Nota final" value={formatGrade(attempt.notaFinal, attempt.escalaCalificacion)} detail={`Aprueba con ${formatGrade(attempt.notaAprobacion)}`} />
        </div>
      </section>

      {isDelivered && (
        <FinalGradeOverride
          key={`${attempt.idIntento}:${attempt.notaFinalManual ?? "none"}:${attempt.notaFinal ?? "none"}:${attempt.notaFinalCalculada ?? "pending"}`}
          attempt={attempt}
        />
      )}

      <AttemptFocusTelemetry idIntento={attempt.idIntento} />

      <section aria-labelledby="questions-title">
        <div className="mb-3">
          <h2 id="questions-title" className="text-lg font-black text-slate-900">Corrección por pregunta</h2>
          <p className="text-sm text-slate-600">Podés asignar puntaje parcial, corregir omisiones o reemplazar una autocorrección.</p>
        </div>
        <div className="space-y-4">
          {attempt.preguntas.map((question) => (
            <QuestionCorrectionCard
              key={`${question.idPregunta}:${question.puntajeObtenido ?? "pending"}:${question.comentariosDocente ?? ""}:${question.fechaCorreccion ?? ""}`}
              idIntento={attempt.idIntento}
              question={question}
              readOnly={!isDelivered}
            />
          ))}
        </div>
      </section>

      {isDelivered && (
        <CorrectionConfirmation attempt={attempt} pendingCount={pendingCount} />
      )}
    </main>
  );
}
