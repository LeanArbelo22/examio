"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { FormFieldError } from "@/components/forms/FormFieldError";
import { LoadingState } from "@/components/ui/LoadingState";
import { QuestionContentEditor } from "@/components/forms/QuestionContentEditor";
import { QuestionBankTagSelector } from "./QuestionBankTagSelector";
import {
  useActualizarPreguntaBanco,
  useCrearPreguntaBanco,
  usePreguntaBanco,
} from "@/hooks/useBancoPreguntas";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import { getUserErrorMessage } from "@/lib/errors";
import { validationErrorsFromZod } from "@/lib/form-validation";
import {
  bankQuestionFormSchema,
  type BankQuestionFormValues,
} from "@/lib/schemas/questionBankSchema";
import type { ExamQuestionVariant } from "@/lib/schemas/examSchema";
import {
  DEFAULT_QUESTION_CONFIGURATION,
  normalizeQuestionConfiguration,
} from "@/lib/question-configuration";
import type {
  BancoPreguntaDetalle,
  BancoPreguntaPayload,
  EstadoBanco,
} from "@/types";

const initialQuestion: BankQuestionFormValues = {
  titulo: "",
  enunciado: "",
  tipo: "mc",
  ...DEFAULT_QUESTION_CONFIGURATION,
  estado: "borrador",
  opciones: [],
  etiquetas: [],
};

export function QuestionBankQuestionEditor({ questionId }: { questionId?: number }) {
  const detailQuery = usePreguntaBanco(questionId ?? null);

  if (questionId && detailQuery.isLoading) {
    return <LoadingState message="Cargando pregunta..." />;
  }
  if (questionId && detailQuery.isError) {
    return (
      <FeedbackMessage
        variant="error"
        message={getUserErrorMessage(detailQuery.error, "No se pudo cargar la pregunta.")}
      />
    );
  }

  return (
    <QuestionBankQuestionForm
      key={questionId ?? "new"}
      questionId={questionId}
      initialQuestion={detailQuery.data}
    />
  );
}

function QuestionBankQuestionForm({
  questionId,
  initialQuestion: detail,
}: {
  questionId?: number;
  initialQuestion?: BancoPreguntaDetalle;
}) {
  const router = useRouter();
  const createQuestion = useCrearPreguntaBanco();
  const updateQuestion = useActualizarPreguntaBanco();
  const idempotency = useIdempotencyKey();
  const [form, setForm] = useState<BankQuestionFormValues>(() =>
    detail
      ? {
          titulo: detail.titulo,
          enunciado: detail.enunciado,
          tipo: detail.tipo,
          ...normalizeQuestionConfiguration(detail.tipo, detail),
          estado: detail.estado,
          opciones: detail.opciones.map((option) => ({
            texto: option.texto,
            esCorrecta: option.esCorrecta,
          })),
          etiquetas: detail.etiquetas.map((tag) => tag.id),
        }
      : initialQuestion,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const questionValue: ExamQuestionVariant = {
    id: questionId ? `bank-${questionId}` : "bank-new",
    enunciado: form.enunciado,
    tipo: form.tipo,
    modoJustificacion: form.modoJustificacion,
    estrategiaCorreccion: form.estrategiaCorreccion,
    tratamientoJustificacion: form.tratamientoJustificacion,
    opciones: form.opciones,
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    const validation = bankQuestionFormSchema.safeParse(form);
    if (!validation.success) {
      setErrors(validationErrorsFromZod(validation.error.issues));
      return;
    }
    setErrors({});
    const payload: BancoPreguntaPayload = {
      Titulo: validation.data.titulo,
      Enunciado: validation.data.enunciado,
      Tipo: validation.data.tipo,
      ModoJustificacion:
        validation.data.modoJustificacion ?? "sin_justificacion",
      EstrategiaCorreccion:
        validation.data.estrategiaCorreccion ?? "exacta",
      TratamientoJustificacion:
        validation.data.tratamientoJustificacion ?? "informativa",
      Estado: validation.data.estado,
      Opciones: validation.data.opciones.map((option) => ({
        Texto: option.texto,
        EsCorrecta: option.esCorrecta,
      })),
      Etiquetas: validation.data.etiquetas,
    };

    try {
      if (questionId && detail) {
        await updateQuestion.mutateAsync({
          id: questionId,
          payload: {
            ...payload,
            RevisionEsperada: detail.revision,
          },
        });
      } else {
        await createQuestion.mutateAsync({
          payload,
          idempotencyKey: idempotency.keyFor(payload),
        });
        idempotency.complete();
      }
      router.push("/profesor/banco-preguntas?tab=preguntas");
    } catch (cause) {
      setFeedback(
        getUserErrorMessage(cause, "No se pudo guardar la pregunta."),
      );
    }
  };

  const isPending = createQuestion.isPending || updateQuestion.isPending;
  return (
    <form onSubmit={submit} className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {questionId ? "Editar pregunta" : "Nueva pregunta"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Guardá un borrador incompleto o habilitalo cuando esté listo para reutilizar.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/profesor/banco-preguntas?tab=preguntas" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
            Cancelar
          </Link>
          <Button type="submit" disabled={isPending} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
            {isPending ? "Guardando..." : "Guardar pregunta"}
          </Button>
        </div>
      </header>

      {feedback && <FeedbackMessage variant="error" message={feedback} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="bank-question-title" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Título interno</label>
            <input id="bank-question-title" value={form.titulo} maxLength={150} onChange={(event) => setForm({ ...form, titulo: event.target.value })} aria-invalid={Boolean(errors.titulo)} aria-describedby={errors.titulo ? "bank-question-title-error" : undefined} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" placeholder="Ej: Protocolos de transporte" />
            <FormFieldError id="bank-question-title-error" message={errors.titulo} />
          </div>

          <QuestionContentEditor
            value={questionValue}
            label="Contenido de la pregunta"
            fieldPrefix=""
            errors={errors}
            onChange={(question) =>
              setForm({
                ...form,
                enunciado: question.enunciado,
                tipo: question.tipo,
                modoJustificacion: question.modoJustificacion,
                estrategiaCorreccion: question.estrategiaCorreccion,
                tratamientoJustificacion: question.tratamientoJustificacion,
                opciones: question.opciones ?? [],
              })
            }
          />
        </section>

        <aside className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="bank-question-status" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Estado</label>
            <select id="bank-question-status" value={form.estado} onChange={(event) => setForm({ ...form, estado: event.target.value as EstadoBanco })} aria-invalid={Boolean(errors.estado)} aria-describedby={errors.estado ? "bank-question-status-error" : undefined} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100">
              <option value="borrador">Borrador</option>
              <option value="disponible">Disponible</option>
              {questionId && <option value="archivado">Archivado</option>}
            </select>
            <FormFieldError id="bank-question-status-error" message={errors.estado} />
          </div>
          <QuestionBankTagSelector selected={form.etiquetas} onChange={(etiquetas) => setForm({ ...form, etiquetas })} />
        </aside>
      </div>
    </form>
  );
}
