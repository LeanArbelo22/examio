"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { Modal } from "@/components/ui/Modal";
import { ExamBasicInfoFields } from "@/components/forms/ExamBasicInfoFields";
import { ExamQuestionStructureEditor } from "@/components/forms/ExamQuestionStructureEditor";
import { ExamScoringSettings } from "@/components/forms/ExamScoringSettings";
import { ExamSettingsSidebar } from "@/components/forms/ExamSettingsSidebar";
import { QuestionBankSelectorModal } from "@/components/question-bank/QuestionBankSelectorModal";
import {
  useCreateEvaluacion,
  useGetDetalleEvaluacion,
  useModificarBorrador,
  usePublicarEvaluacion,
} from "@/hooks/useEvaluaciones";
import {
  useCrearGrupoBancoDesdeContenido,
  useCrearPreguntaBanco,
} from "@/hooks/useBancoPreguntas";
import { useGetComisionesDocente } from "@/hooks/useDocentes";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import { getUserErrorMessage } from "@/lib/errors";
import {
  fromEvaluacionDetalle,
  toGuardarEvaluacionPayload,
  toModificarBorradorPayload,
  toPublicarEvaluacionPayload,
} from "@/lib/exam-form";
import {
  toBankGroupPayload,
  toBankQuestionPayload,
  withSavedGroupReferences,
  withSavedQuestionReference,
  type PendingBankImport,
} from "@/lib/exam-bank";
import { validationErrorsFromZod } from "@/lib/form-validation";
import {
  distributeEqualScores,
  scaleScoreInput,
} from "@/lib/exam-scoring";
import {
  DEFAULT_QUESTION_CONFIGURATION,
} from "@/lib/question-configuration";
import {
  defaultExamSchedule,
  examDraftFormSchema,
  examFormSchema,
  type ExamDraftFormValues,
} from "@/lib/schemas/examSchema";
import type {
  ComisionDocente,
  EscalaCalificacion,
  EvaluacionDetalle,
  ModoPuntaje,
} from "@/types";

function initialForm(schedule = defaultExamSchedule()): ExamDraftFormValues {
  return {
    titulo: "",
    descripcion: "",
    idMateriaDivision: "",
    duracionMinutos: "90",
    cantidadIntentos: "1",
    escalaCalificacion: 10,
    notaAprobacion: "4",
    modoPuntaje: "iguales",
    mostrarPuntajePorPregunta: false,
    correccionAutomaticaCerradas: true,
    fechaInicio: schedule.fechaInicio,
    fechaFin: schedule.fechaFin,
    preguntas: [
      {
        id: 1,
        tituloReferencia: "",
        puntajeMaximo: "",
        variantes: [
          {
            id: "initial-variant-1",
            enunciado: "",
            tipo: "mc",
            ...DEFAULT_QUESTION_CONFIGURATION,
            opciones: [],
          },
        ],
      },
    ],
  };
}

export function EvaluationEditor({
  idPublicacion,
  initialSchedule,
}: {
  idPublicacion?: number;
  initialSchedule?: ReturnType<typeof defaultExamSchedule>;
}) {
  const { data: session } = useSession();
  const legajo = session?.user?.identificadorInstitucional
    ? Number(session.user.identificadorInstitucional)
    : 0;
  const detailQuery = useGetDetalleEvaluacion(idPublicacion ?? 0);
  const commissionsQuery = useGetComisionesDocente(legajo);

  if (idPublicacion && (detailQuery.isLoading || commissionsQuery.isLoading)) {
    return <LoadingState message="Cargando borrador..." />;
  }
  if (idPublicacion && detailQuery.isError) {
    return (
      <RequestErrorState
        error={detailQuery.error}
        fallback="No se pudo cargar el borrador."
        onRetry={() => detailQuery.refetch()}
        showRetry
      />
    );
  }
  if (commissionsQuery.isError) {
    return (
      <RequestErrorState
        error={commissionsQuery.error}
        fallback="No se pudieron cargar tus comisiones."
        onRetry={() => commissionsQuery.refetch()}
        showRetry
      />
    );
  }
  if (idPublicacion && detailQuery.data?.estado !== "borrador") {
    return (
      <FeedbackMessage
        variant="warning"
        message="Esta evaluación ya no es un borrador y no puede editarse estructuralmente."
      />
    );
  }

  const detail = detailQuery.data;
  const commissions: ComisionDocente[] = commissionsQuery.data ?? [];
  const matches = detail
    ? commissions.filter((commission) =>
        detail.idMateriaDivision
          ? commission.idComision === detail.idMateriaDivision
          : commission.nombreMateria === detail.materia &&
            commission.division === detail.division,
      )
    : [];
  const commissionId = detail?.idMateriaDivision ??
    (matches.length === 1 ? matches[0].idComision : 0);

  return (
    <EvaluationEditorForm
      key={detail ? `${detail.idPublicacion}-${detail.revision}` : "new"}
      idPublicacion={idPublicacion}
      detail={detail}
      commissions={commissions}
      commissionsLoading={commissionsQuery.isLoading}
      initialCommissionId={commissionId}
      legajo={legajo}
      refreshDetail={() => detailQuery.refetch()}
      initialSchedule={initialSchedule}
    />
  );
}

function EvaluationEditorForm({
  idPublicacion,
  detail,
  commissions,
  commissionsLoading,
  initialCommissionId,
  legajo,
  refreshDetail,
  initialSchedule,
}: {
  idPublicacion?: number;
  detail?: EvaluacionDetalle;
  commissions: ComisionDocente[];
  commissionsLoading: boolean;
  initialCommissionId: number;
  legajo: number;
  refreshDetail: () => Promise<unknown>;
  initialSchedule?: ReturnType<typeof defaultExamSchedule>;
}) {
  const router = useRouter();
  const createEvaluation = useCreateEvaluacion(legajo);
  const updateDraft = useModificarBorrador(
    detail?.idActividad ?? 0,
    idPublicacion ?? 0,
    legajo,
  );
  const publishEvaluation = usePublicarEvaluacion(
    detail?.idActividad ?? 0,
    idPublicacion ?? 0,
    legajo,
  );
  const createBankQuestion = useCrearPreguntaBanco();
  const createBankGroup = useCrearGrupoBancoDesdeContenido();
  const draftIdempotency = useIdempotencyKey();
  const publishIdempotency = useIdempotencyKey();
  const bankIdempotency = useIdempotencyKey();
  const [form, setForm] = useState<ExamDraftFormValues>(() =>
    detail
      ? fromEvaluacionDetalle(detail, initialCommissionId)
      : initialForm(initialSchedule),
  );
  const [allowedResources, setAllowedResources] = useState(
    detail?.recursosPermitidos ?? "",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pendingImports, setPendingImports] = useState<PendingBankImport[]>([]);
  const [bankSelectorOpen, setBankSelectorOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [saveAllInBank, setSaveAllInBank] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [savingTarget, setSavingTarget] = useState<string | null>(null);
  const [scaleChangeNotice, setScaleChangeNotice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<
    { variant: "error" | "success" | "warning"; message: string } | null
  >(
    detail && !initialCommissionId
      ? {
          variant: "warning",
          message:
            "La API no informó la comisión del borrador de forma inequívoca. Seleccionala antes de guardar para evitar asignarlo incorrectamente.",
        }
      : null,
  );

  const validateField = (field: string) => {
    const result = examDraftFormSchema.safeParse(form);
    const errors = result.success
      ? {}
      : validationErrorsFromZod(result.error.issues);
    setFieldErrors((current) => {
      const next = { ...current };
      if (errors[field]) next[field] = errors[field];
      else delete next[field];
      return next;
    });
  };

  const saveDraft = async () => {
    setFeedback(null);
    const validation = examDraftFormSchema.safeParse(form);
    if (!validation.success) {
      setFieldErrors(validationErrorsFromZod(validation.error.issues));
      setFeedback({
        variant: "error",
        message: "Revisá los datos básicos señalados antes de guardar el borrador.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setFieldErrors({});

    try {
      const importPayloads = pendingImports.map((item) => item.payload);
      if (idPublicacion && detail) {
        const payload = toModificarBorradorPayload(
          validation.data,
          allowedResources.trim(),
          idPublicacion,
          detail.revision,
          importPayloads,
        );
        await updateDraft.mutateAsync(payload);
        setPendingImports([]);
        await refreshDetail();
      } else {
        const payload = toGuardarEvaluacionPayload(
          validation.data,
          allowedResources.trim(),
          "borrador",
          importPayloads,
        );
        const result = await createEvaluation.mutateAsync({
          payload,
          idempotencyKey: draftIdempotency.keyFor(payload),
        });
        draftIdempotency.complete();
        router.replace(`/profesor/examen/${result.idPublicacion}/editar`);
      }
    } catch (cause) {
      setFeedback({
        variant: "error",
        message: getUserErrorMessage(
          cause,
          idPublicacion
            ? "No se pudo actualizar el borrador."
            : "No se pudo crear el borrador.",
        ),
      });
    }
  };

  const openPublishConfirmation = () => {
    if (
      (form.modoPuntaje ?? "iguales") === "personalizados" &&
      pendingImports.length > 0
    ) {
      setFeedback({
        variant: "warning",
        message:
          "Guardá primero el borrador para incorporar el contenido del banco y asignarle puntaje antes de publicar.",
      });
      return;
    }
    const validation = examFormSchema.safeParse(form);
    if (!validation.success) {
      setFieldErrors(validationErrorsFromZod(validation.error.issues));
      setFeedback({
        variant: "error",
        message: "Completá la configuración y todas las preguntas antes de publicar.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setFieldErrors({});
    setSaveAllInBank(false);
    setPublishError(null);
    setPublishModalOpen(true);
  };

  const publishDraft = async () => {
    if (!detail || !idPublicacion) return;
    const validation = examFormSchema.safeParse(form);
    if (!validation.success) {
      setPublishModalOpen(false);
      setFieldErrors(validationErrorsFromZod(validation.error.issues));
      setFeedback({
        variant: "error",
        message: "La evaluación cambió y ya no cumple los requisitos de publicación.",
      });
      return;
    }
    const payload = toPublicarEvaluacionPayload(
      validation.data,
      allowedResources.trim(),
      idPublicacion,
      detail.revision,
      saveAllInBank,
      pendingImports.map((item) => item.payload),
    );
    try {
      setPublishError(null);
      await publishEvaluation.mutateAsync({
        payload,
        idempotencyKey: publishIdempotency.keyFor(payload),
      });
      publishIdempotency.complete();
      router.replace(`/profesor/examen/${idPublicacion}/detalle`);
    } catch (cause) {
      setPublishError(
        getUserErrorMessage(
          cause,
          "No se pudo publicar. El borrador y el banco no fueron modificados.",
        ),
      );
    }
  };

  const saveQuestionInBank = async (
    groupIndex: number,
    variantIndex: number,
  ) => {
    const group = form.preguntas[groupIndex];
    const variant = group?.variantes[variantIndex];
    if (!group || !variant || variant.bankReference) return;
    const payload = toBankQuestionPayload(group, variant, variantIndex);
    const target = `variant-${groupIndex}-${variantIndex}`;
    setSavingTarget(target);
    setFeedback(null);
    try {
      const saved = await createBankQuestion.mutateAsync({
        payload,
        idempotencyKey: bankIdempotency.keyFor(payload),
      });
      bankIdempotency.complete();
      setForm((current) => ({
        ...current,
        preguntas: withSavedQuestionReference(
          current.preguntas,
          groupIndex,
          variantIndex,
          saved,
        ),
      }));
      setFeedback({
        variant: "success",
        message: "La pregunta se guardó como borrador en tu banco. La copia de la evaluación sigue siendo editable.",
      });
    } catch (cause) {
      setFeedback({
        variant: "error",
        message: getUserErrorMessage(cause, "No se pudo guardar la pregunta en el banco."),
      });
    } finally {
      setSavingTarget(null);
    }
  };

  const saveGroupInBank = async (groupIndex: number) => {
    const group = form.preguntas[groupIndex];
    if (!group || group.bankReference) return;
    if (group.variantes.length === 0) {
      setFeedback({ variant: "error", message: "Agregá al menos una variante antes de guardar el grupo en el banco." });
      return;
    }
    const payload = toBankGroupPayload(group);
    const target = `group-${groupIndex}`;
    setSavingTarget(target);
    setFeedback(null);
    try {
      const saved = await createBankGroup.mutateAsync({
        payload,
        idempotencyKey: bankIdempotency.keyFor(payload),
      });
      bankIdempotency.complete();
      setForm((current) => ({
        ...current,
        preguntas: withSavedGroupReferences(
          current.preguntas,
          groupIndex,
          payload,
          saved,
        ),
      }));
      setFeedback({
        variant: "success",
        message: "El grupo y sus variantes se guardaron como borradores en tu banco.",
      });
    } catch (cause) {
      setFeedback({
        variant: "error",
        message: getUserErrorMessage(cause, "No se pudo guardar el grupo en el banco."),
      });
    } finally {
      setSavingTarget(null);
    }
  };

  const changeScale = (nextScale: EscalaCalificacion) => {
    const previousScale = form.escalaCalificacion ?? 10;
    if (previousScale === nextScale) return;
    const factor = nextScale / previousScale;
    setForm((current) => ({
      ...current,
      escalaCalificacion: nextScale,
      notaAprobacion: scaleScoreInput(
        current.notaAprobacion ?? "4",
        previousScale,
        nextScale,
      ),
      preguntas: current.preguntas.map((group) => ({
        ...group,
        puntajeMaximo: scaleScoreInput(
          group.puntajeMaximo,
          previousScale,
          nextScale,
        ),
      })),
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.notaAprobacion;
      delete next.puntajesPersonalizados;
      Object.keys(next)
        .filter((key) => key.endsWith(".puntajeMaximo"))
        .forEach((key) => delete next[key]);
      return next;
    });
    setScaleChangeNotice(
      `La escala cambió de ${previousScale} a ${nextScale}. La nota de aprobación y los puntajes cargados se ajustaron proporcionalmente (×${factor}).`,
    );
  };

  const changeScoreMode = (mode: ModoPuntaje) => {
    setForm((current) => {
      if (mode !== "personalizados") {
        return { ...current, modoPuntaje: mode };
      }
      const equalScores = distributeEqualScores(
        current.preguntas.length,
        current.escalaCalificacion ?? 10,
      );
      return {
        ...current,
        modoPuntaje: mode,
        preguntas: current.preguntas.map((group, index) => ({
          ...group,
          puntajeMaximo: group.puntajeMaximo?.trim()
            ? group.puntajeMaximo
            : equalScores[index] ?? "",
        })),
      };
    });
  };

  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  const maxDate = `${now.getFullYear() + 10}-12-31T23:59`;
  const isPending =
    createEvaluation.isPending ||
    updateDraft.isPending ||
    publishEvaluation.isPending ||
    createBankQuestion.isPending ||
    createBankGroup.isPending;
  const excludedQuestionIds = [
    ...form.preguntas.flatMap((group) =>
      group.variantes.flatMap((variant) =>
        variant.bankReference ? [variant.bankReference.id] : [],
      ),
    ),
    ...pendingImports.flatMap((item) => item.questionIds),
  ];
  const excludedGroupIds = [
    ...form.preguntas.flatMap((group) =>
      group.bankReference ? [group.bankReference.id] : [],
    ),
    ...pendingImports.flatMap((item) =>
      item.payload.Tipo === "grupo" ? [item.payload.IdGrupo] : [],
    ),
  ];

  return (
    <div className="space-y-8 pb-16 antialiased">
      <header className="flex flex-col gap-4 border-b border-slate-200/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {idPublicacion ? "Editar borrador" : "Configurar nueva evaluación"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Podés guardar avances incompletos y continuar más adelante.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => router.push("/profesor")} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancelar</Button>
          <Button type="button" onClick={saveDraft} disabled={isPending} className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50">{isPending ? "Guardando..." : idPublicacion ? "Guardar cambios" : "Guardar borrador"}</Button>
          {idPublicacion && (
            <Button type="button" onClick={openPublishConfirmation} disabled={isPending} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">Publicar evaluación</Button>
          )}
        </div>
      </header>

      {feedback && <FeedbackMessage variant={feedback.variant} message={feedback.message} />}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ExamBasicInfoFields
            title={form.titulo}
            description={form.descripcion}
            errors={fieldErrors}
            onTitleChange={(titulo) => setForm({ ...form, titulo })}
            onDescriptionChange={(descripcion) => setForm({ ...form, descripcion })}
            onBlur={validateField}
          />
          <ExamScoringSettings
            scale={form.escalaCalificacion ?? 10}
            passingGrade={form.notaAprobacion ?? "4"}
            scoreMode={form.modoPuntaje ?? "iguales"}
            showScoreToStudent={form.mostrarPuntajePorPregunta ?? false}
            autoGradeClosedQuestions={
              form.correccionAutomaticaCerradas ?? true
            }
            groupScores={form.preguntas.map((group) => group.puntajeMaximo)}
            errors={fieldErrors}
            scaleChangeNotice={scaleChangeNotice}
            onScaleChange={changeScale}
            onPassingGradeChange={(notaAprobacion) =>
              setForm({ ...form, notaAprobacion })
            }
            onScoreModeChange={changeScoreMode}
            onShowScoreToStudentChange={(mostrarPuntajePorPregunta) =>
              setForm({ ...form, mostrarPuntajePorPregunta })
            }
            onAutoGradeClosedQuestionsChange={
              (correccionAutomaticaCerradas) =>
                setForm({ ...form, correccionAutomaticaCerradas })
            }
            onBlur={validateField}
          />
          <ExamQuestionStructureEditor
            groups={form.preguntas}
            errors={fieldErrors}
            onChange={(preguntas) => setForm({ ...form, preguntas })}
            onBlur={validateField}
            onSaveGroupToBank={(groupIndex) => void saveGroupInBank(groupIndex)}
            onSaveVariantToBank={(groupIndex, variantIndex) =>
              void saveQuestionInBank(groupIndex, variantIndex)
            }
            savingTarget={savingTarget}
            scoringScale={form.escalaCalificacion ?? 10}
            scoringMode={form.modoPuntaje ?? "iguales"}
            pendingImportedGroups={pendingImports.length}
          />

          <section className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Contenido de tu banco</h2>
                <p className="mt-0.5 text-xs text-slate-600">Las selecciones se copian al guardar el borrador o publicar.</p>
              </div>
              <Button type="button" onClick={() => setBankSelectorOpen(true)} disabled={isPending} className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
                Agregar desde mi banco
              </Button>
            </div>
            {(form.modoPuntaje ?? "iguales") === "personalizados" &&
              pendingImports.length > 0 && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  Guardá el borrador para incorporar estas preguntas o grupos. Después podrás asignarles puntaje antes de publicar.
                </p>
              )}
            {pendingImports.length > 0 ? (
              <ul className="space-y-2" aria-label="Importaciones pendientes del banco">
                {pendingImports.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-white px-3 py-2">
                    <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{item.label}</span><span className="text-xs capitalize text-slate-500">{item.kind} · copia independiente pendiente</span></span>
                    <button type="button" onClick={() => setPendingImports((current) => current.filter((pending) => pending.key !== item.key))} className="rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50">Quitar</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No hay importaciones pendientes.</p>
            )}
          </section>
        </div>

        <ExamSettingsSidebar
          duration={form.duracionMinutos}
          attempts={form.cantidadIntentos}
          startDate={form.fechaInicio}
          endDate={form.fechaFin}
          commissionId={form.idMateriaDivision}
          commissions={commissions}
          loadingCommissions={commissionsLoading}
          minDate={idPublicacion ? "" : localNow}
          maxDate={maxDate}
          errors={fieldErrors}
          allowedResources={allowedResources}
          onDurationChange={(duracionMinutos) => setForm({ ...form, duracionMinutos })}
          onAttemptsChange={(cantidadIntentos) => setForm({ ...form, cantidadIntentos })}
          onStartDateChange={(fechaInicio) => setForm({ ...form, fechaInicio })}
          onEndDateChange={(fechaFin) => setForm({ ...form, fechaFin })}
          onCommissionChange={(idMateriaDivision) => setForm({ ...form, idMateriaDivision })}
          onAllowedResourcesChange={setAllowedResources}
          onBlur={validateField}
        />
      </div>

      <QuestionBankSelectorModal
        isOpen={bankSelectorOpen}
        onClose={() => setBankSelectorOpen(false)}
        onConfirm={(imports) => setPendingImports((current) => [...current, ...imports])}
        excludedQuestionIds={excludedQuestionIds}
        excludedGroupIds={excludedGroupIds}
      />

      <Modal
        isOpen={publishModalOpen}
        onClose={() => {
          if (publishEvaluation.isPending) return;
          setPublishModalOpen(false);
          setSaveAllInBank(false);
          setPublishError(null);
        }}
        title="Publicar evaluación"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            La última edición, las importaciones pendientes y la publicación se confirmarán en una única transacción. Si algo falla, la evaluación seguirá como borrador.
          </p>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 focus-within:ring-2 focus-within:ring-indigo-500">
            <input
              type="checkbox"
              checked={saveAllInBank}
              onChange={(event) => setSaveAllInBank(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <span><span className="block text-sm font-bold text-slate-800">Guardar todas las preguntas en mi banco</span><span className="mt-1 block text-xs text-slate-500">Está desmarcado por defecto. Lo que ya guardaste individualmente se conserva aunque no actives esta opción.</span></span>
          </label>
          {publishError && <FeedbackMessage variant="error" message={publishError} />}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" onClick={() => { setPublishModalOpen(false); setSaveAllInBank(false); setPublishError(null); }} disabled={publishEvaluation.isPending} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Cancelar</Button>
            <Button type="button" onClick={() => void publishDraft()} disabled={publishEvaluation.isPending} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              {publishEvaluation.isPending ? "Publicando..." : "Confirmar publicación"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
