"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { FormFieldError } from "@/components/forms/FormFieldError";
import { LoadingState } from "@/components/ui/LoadingState";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import { QuestionContentEditor } from "@/components/forms/QuestionContentEditor";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QuestionBankTagSelector } from "./QuestionBankTagSelector";
import {
  useActualizarGrupoBanco,
  useCrearGrupoBanco,
  useCrearGrupoBancoDesdeContenido,
  useGrupoBanco,
  usePreguntasBanco,
} from "@/hooks/useBancoPreguntas";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import { getUserErrorMessage } from "@/lib/errors";
import { validationErrorsFromZod } from "@/lib/form-validation";
import {
  bankGroupFormSchema,
  bankQuestionFormSchema,
  type BankGroupFormValues,
  type BankQuestionFormValues,
} from "@/lib/schemas/questionBankSchema";
import type { ExamQuestionVariant } from "@/lib/schemas/examSchema";
import { DEFAULT_QUESTION_CONFIGURATION } from "@/lib/question-configuration";
import type {
  BancoPreguntaGrupoPayload,
  BancoPreguntaListado,
  BancoGrupoDetalle,
  EstadoBanco,
} from "@/types";

interface NewQuestion {
  key: string;
  form: BankQuestionFormValues;
}

const initialGroup: BankGroupFormValues = {
  tituloReferencia: "",
  estado: "borrador",
  preguntas: [],
  etiquetas: [],
};

function emptyNewQuestion(): NewQuestion {
  return {
    key: crypto.randomUUID(),
    form: {
      titulo: "",
      enunciado: "",
      tipo: "mc",
      ...DEFAULT_QUESTION_CONFIGURATION,
      estado: "borrador",
      opciones: [],
      etiquetas: [],
    },
  };
}

const toneByStatus = {
  borrador: "warning",
  disponible: "success",
  archivado: "neutral",
} as const;

export function QuestionBankGroupEditor({ groupId }: { groupId?: number }) {
  const detailQuery = useGrupoBanco(groupId ?? null);
  if (groupId && detailQuery.isLoading) {
    return <LoadingState message="Cargando grupo..." />;
  }
  if (groupId && detailQuery.isError) {
    return <FeedbackMessage variant="error" message={getUserErrorMessage(detailQuery.error, "No se pudo cargar el grupo.")} />;
  }
  return (
    <QuestionBankGroupForm
      key={groupId ?? "new"}
      groupId={groupId}
      initialGroup={detailQuery.data}
    />
  );
}

function QuestionBankGroupForm({
  groupId,
  initialGroup: detail,
}: {
  groupId?: number;
  initialGroup?: BancoGrupoDetalle;
}) {
  const router = useRouter();
  const [form, setForm] = useState<BankGroupFormValues>(() =>
    detail
      ? {
          tituloReferencia: detail.tituloReferencia,
          estado: detail.estado,
          preguntas: detail.preguntas.map((question) => question.id),
          etiquetas: detail.etiquetas.map((tag) => tag.id),
        }
      : initialGroup,
  );
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<BancoPreguntaListado[]>(
    () =>
      detail?.preguntas.map((question) => ({
        id: question.id,
        idDocente: detail.idDocente,
        titulo: question.titulo,
        resumen: "",
        tipo: question.tipo,
        estado: question.estado,
        revision: question.revision,
        fechaCreacion: detail.fechaCreacion,
        fechaActualizacion: detail.fechaActualizacion,
      })) ?? [],
  );
  const [newQuestions, setNewQuestions] = useState<NewQuestion[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const questionsQuery = usePreguntasBanco({
    texto: appliedSearch || undefined,
    pagina: 1,
    tamano: 100,
  });
  const createGroup = useCrearGrupoBanco();
  const createCompositeGroup = useCrearGrupoBancoDesdeContenido();
  const updateGroup = useActualizarGrupoBanco();
  const idempotency = useIdempotencyKey();

  const availableQuestions = useMemo(() => {
    const byId = new Map<number, BancoPreguntaListado>();
    for (const question of selectedQuestions) byId.set(question.id, question);
    for (const question of questionsQuery.data?.items ?? []) byId.set(question.id, question);
    return [...byId.values()];
  }, [questionsQuery.data?.items, selectedQuestions]);

  const toggleQuestion = (question: BancoPreguntaListado) => {
    const selected = form.preguntas.includes(question.id);
    setForm({
      ...form,
      preguntas: selected
        ? form.preguntas.filter((id) => id !== question.id)
        : [...form.preguntas, question.id],
    });
    setSelectedQuestions((current) =>
      selected
        ? current.filter((item) => item.id !== question.id)
        : [...current.filter((item) => item.id !== question.id), question],
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    const effectiveForm = {
      ...form,
      estado: newQuestions.length > 0 ? ("borrador" as const) : form.estado,
    };
    const validation = bankGroupFormSchema.safeParse(effectiveForm);
    const validationErrors = validation.success
      ? {}
      : validationErrorsFromZod(validation.error.issues);

    newQuestions.forEach((question, index) => {
      const result = bankQuestionFormSchema.safeParse(question.form);
      if (!result.success) {
        for (const [path, message] of Object.entries(
          validationErrorsFromZod(result.error.issues),
        )) {
          validationErrors[`nuevas.${index}.${path}`] = message;
        }
      }
    });

    if (!validation.success || Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    if (
      effectiveForm.estado === "disponible" &&
      (validation.data.preguntas.length === 0 ||
        selectedQuestions.some((question) => question.estado !== "disponible"))
    ) {
      setFeedback(
        "Para habilitar el grupo, seleccioná al menos una pregunta y asegurate de que todas estén disponibles.",
      );
      return;
    }

    try {
      if (groupId && detail) {
        await updateGroup.mutateAsync({
          id: groupId,
          payload: {
            TituloReferencia: validation.data.tituloReferencia,
            Estado: validation.data.estado,
            Preguntas: validation.data.preguntas,
            Etiquetas: validation.data.etiquetas,
            RevisionEsperada: detail.revision,
          },
        });
      } else if (newQuestions.length > 0) {
        const questions: BancoPreguntaGrupoPayload[] = [
          ...selectedQuestions
            .filter((question) => validation.data.preguntas.includes(question.id))
            .map((question) => ({
              Origen: "existente" as const,
              IdPregunta: question.id,
              RevisionEsperada: question.revision,
            })),
          ...newQuestions.map((question) => ({
            Origen: "nueva" as const,
            ClaveCliente: question.key,
            Pregunta: {
              Titulo: question.form.titulo.trim(),
              Enunciado: question.form.enunciado,
              Tipo: question.form.tipo,
               ModoJustificacion:
                 question.form.modoJustificacion ?? "sin_justificacion",
               EstrategiaCorreccion:
                 question.form.estrategiaCorreccion ?? "exacta",
               TratamientoJustificacion:
                 question.form.tratamientoJustificacion ?? "informativa",
              Opciones: question.form.opciones.map((option) => ({
                Texto: option.texto,
                EsCorrecta: option.esCorrecta,
              })),
              Etiquetas: question.form.etiquetas,
            },
          })),
        ];
        const payload = {
          TituloReferencia: validation.data.tituloReferencia,
          Etiquetas: validation.data.etiquetas,
          Preguntas: questions,
        };
        await createCompositeGroup.mutateAsync({
          payload,
          idempotencyKey: idempotency.keyFor(payload),
        });
        idempotency.complete();
      } else {
        const payload = {
          TituloReferencia: validation.data.tituloReferencia,
          Estado: validation.data.estado,
          Preguntas: validation.data.preguntas,
          Etiquetas: validation.data.etiquetas,
        };
        await createGroup.mutateAsync({
          payload,
          idempotencyKey: idempotency.keyFor(payload),
        });
        idempotency.complete();
      }
      router.push("/profesor/banco-preguntas?tab=grupos");
    } catch (cause) {
      setFeedback(getUserErrorMessage(cause, "No se pudo guardar el grupo."));
    }
  };

  const isPending = createGroup.isPending || createCompositeGroup.isPending || updateGroup.isPending;

  return (
    <form onSubmit={submit} className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{groupId ? "Editar grupo" : "Nuevo grupo"}</h1>
          <p className="mt-1 text-sm text-slate-500">Agrupá variantes equivalentes y conservá su orden de selección.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/profesor/banco-preguntas?tab=grupos" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancelar</Link>
          <Button type="submit" disabled={isPending} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{isPending ? "Guardando..." : "Guardar grupo"}</Button>
        </div>
      </header>

      {feedback && <FeedbackMessage variant="error" message={feedback} />}
      {newQuestions.length > 0 && <FeedbackMessage variant="info" message="Los grupos que crean preguntas nuevas se guardan inicialmente como borrador." />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <label htmlFor="bank-group-title" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Título del grupo</label>
              <input id="bank-group-title" value={form.tituloReferencia} maxLength={150} onChange={(event) => setForm({ ...form, tituloReferencia: event.target.value })} aria-invalid={Boolean(errors.tituloReferencia)} aria-describedby={errors.tituloReferencia ? "bank-group-title-error" : undefined} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
              <FormFieldError id="bank-group-title-error" message={errors.tituloReferencia} />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="bank-group-search">Buscar preguntas</label>
              <input id="bank-group-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar preguntas del banco" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
              <Button type="button" onClick={() => setAppliedSearch(search.trim())} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Buscar</Button>
            </div>

            {questionsQuery.isLoading && <LoadingState message="Cargando preguntas..." />}
            {questionsQuery.isError && (
              <RequestErrorState
                error={questionsQuery.error}
                fallback="No se pudieron cargar las preguntas del banco."
                onRetry={() => questionsQuery.refetch()}
                showRetry
              />
            )}
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {availableQuestions.map((question) => (
                <label key={question.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500">
                  <input type="checkbox" checked={form.preguntas.includes(question.id)} onChange={() => toggleQuestion(question)} className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{question.titulo}</span>
                      <StatusBadge label={question.estado} tone={toneByStatus[question.estado]} />
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">{question.resumen || `${question.tipo.toUpperCase()} · revisión ${question.revision}`}</span>
                  </span>
                </label>
              ))}
              {!questionsQuery.isLoading &&
                !questionsQuery.isError &&
                availableQuestions.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                    No se encontraron preguntas.
                  </p>
                )}
            </div>
          </section>

          {!groupId && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Preguntas nuevas dentro del grupo</h2>
                  <p className="text-xs text-slate-500">Se crean junto con el grupo en una sola transacción.</p>
                </div>
                <Button type="button" onClick={() => setNewQuestions((current) => [...current, emptyNewQuestion()])} className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700">+ Nueva pregunta</Button>
              </div>
              {newQuestions.map((question, index) => {
                const variant: ExamQuestionVariant = {
                  id: question.key,
                  enunciado: question.form.enunciado,
                  tipo: question.form.tipo,
                  modoJustificacion:
                    question.form.modoJustificacion ?? "sin_justificacion",
                  estrategiaCorreccion:
                    question.form.estrategiaCorreccion ?? "exacta",
                  tratamientoJustificacion:
                    question.form.tratamientoJustificacion ?? "informativa",
                  opciones: question.form.opciones,
                };
                return (
                  <article key={question.key} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex gap-2">
                      <div className="min-w-0 flex-1">
                        <label className="sr-only" htmlFor={`new-question-${question.key}`}>Título de la pregunta nueva {index + 1}</label>
                        <input id={`new-question-${question.key}`} value={question.form.titulo} maxLength={150} onChange={(event) => setNewQuestions((current) => current.map((item) => item.key === question.key ? { ...item, form: { ...item.form, titulo: event.target.value } } : item))} placeholder={`Título de la pregunta nueva ${index + 1}`} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-indigo-600" />
                        <FormFieldError id={`new-question-${question.key}-title-error`} message={errors[`nuevas.${index}.titulo`]} />
                      </div>
                      <button type="button" onClick={() => setNewQuestions((current) => current.filter((item) => item.key !== question.key))} className="self-start rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50">Eliminar</button>
                    </div>
                    <QuestionContentEditor
                      value={variant}
                      label={`Pregunta nueva ${index + 1}`}
                      fieldPrefix={`nuevas.${index}`}
                      errors={errors}
                      onChange={(next) =>
                        setNewQuestions((current) =>
                          current.map((item) =>
                            item.key === question.key
                              ? {
                                  ...item,
                                  form: {
                                    ...item.form,
                                    enunciado: next.enunciado,
                                    tipo: next.tipo,
                                    modoJustificacion: next.modoJustificacion,
                                    estrategiaCorreccion: next.estrategiaCorreccion,
                                    tratamientoJustificacion:
                                      next.tratamientoJustificacion,
                                    opciones: next.opciones ?? [],
                                  },
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </article>
                );
              })}
            </section>
          )}
        </div>

        <aside className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="bank-group-status" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Estado</label>
            <select id="bank-group-status" value={newQuestions.length > 0 ? "borrador" : form.estado} disabled={newQuestions.length > 0} onChange={(event) => setForm({ ...form, estado: event.target.value as EstadoBanco })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm disabled:opacity-60">
              <option value="borrador">Borrador</option>
              <option value="disponible">Disponible</option>
              {groupId && <option value="archivado">Archivado</option>}
            </select>
          </div>
          <p className="text-xs font-medium text-slate-500">{form.preguntas.length} pregunta{form.preguntas.length === 1 ? "" : "s"} existente{form.preguntas.length === 1 ? "" : "s"} seleccionada{form.preguntas.length === 1 ? "" : "s"}.</p>
          <QuestionBankTagSelector selected={form.etiquetas} onChange={(etiquetas) => setForm({ ...form, etiquetas })} />
        </aside>
      </div>
    </form>
  );
}
