import { Button } from "@/components/ui/Button";
import { FormFieldError } from "@/components/forms/FormFieldError";
import { QuestionContentEditor } from "@/components/forms/QuestionContentEditor";
import type {
  ExamQuestionGroup,
  ExamQuestionVariant,
} from "@/lib/schemas/examSchema";
import { distributeEqualScores } from "@/lib/exam-scoring";
import { DEFAULT_QUESTION_CONFIGURATION } from "@/lib/question-configuration";
import type { EscalaCalificacion, ModoPuntaje } from "@/types";

function emptyVariant(): ExamQuestionVariant {
  return {
    id: crypto.randomUUID(),
    enunciado: "",
    tipo: "mc",
    ...DEFAULT_QUESTION_CONFIGURATION,
    opciones: [],
  };
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function ExamQuestionStructureEditor({
  groups,
  errors,
  onChange,
  onBlur,
  onSaveGroupToBank,
  onSaveVariantToBank,
  savingTarget,
  scoringScale = 10,
  scoringMode = "iguales",
  pendingImportedGroups = 0,
}: {
  groups: ExamQuestionGroup[];
  errors: Record<string, string>;
  onChange: (groups: ExamQuestionGroup[]) => void;
  onBlur: (field: string) => void;
  onSaveGroupToBank?: (groupIndex: number) => void;
  onSaveVariantToBank?: (groupIndex: number, variantIndex: number) => void;
  savingTarget?: string | null;
  scoringScale?: EscalaCalificacion;
  scoringMode?: ModoPuntaje;
  pendingImportedGroups?: number;
}) {
  const equalScores = distributeEqualScores(
    groups.length + pendingImportedGroups,
    scoringScale,
  );
  const addGroup = () => {
    const nextId = Math.max(0, ...groups.map((group) => group.id)) + 1;
    onChange([
      ...groups,
      {
        id: nextId,
        tituloReferencia: "",
        puntajeMaximo: "",
        variantes: [emptyVariant()],
      },
    ]);
  };

  const updateGroup = (groupIndex: number, next: ExamQuestionGroup) => {
    onChange(groups.map((group, index) => (index === groupIndex ? next : group)));
  };

  return (
    <section className="space-y-4" aria-labelledby="exam-structure-title">
      <div>
        <div>
          <h2 id="exam-structure-title" className="text-base font-bold text-slate-800">
            Estructura de preguntas y variantes
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Los borradores admiten contenido incompleto; para publicar se validará la estructura completa.
          </p>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Este borrador todavía no tiene preguntas. Podés guardarlo así y completar la estructura más adelante.
        </div>
      )}

      {groups.map((group, groupIndex) => {
        const titlePath = `preguntas.${groupIndex}.tituloReferencia`;
        return (
          <article
            key={group.id}
            className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
          >
            <div className="-mx-6 -mt-6 flex flex-wrap items-start justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-slate-50 p-4">
              <div className="min-w-[240px] flex-1">
                <label className="sr-only" htmlFor={`exam-group-${group.id}`}>
                  Título del grupo {groupIndex + 1}
                </label>
                <input
                  id={`exam-group-${group.id}`}
                  value={group.tituloReferencia}
                  maxLength={150}
                  placeholder={`Título del grupo ${groupIndex + 1}`}
                  onChange={(event) =>
                    updateGroup(groupIndex, {
                      ...group,
                      tituloReferencia: event.target.value,
                    })
                  }
                  onBlur={() => onBlur(titlePath)}
                  aria-invalid={Boolean(errors[titlePath])}
                  aria-describedby={errors[titlePath] ? `exam-group-${group.id}-error` : undefined}
                  className="w-full rounded-lg border-0 bg-transparent px-2 py-1 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <FormFieldError id={`exam-group-${group.id}-error`} message={errors[titlePath]} />
              </div>
              <div className="w-36 shrink-0">
                {scoringMode === "personalizados" ? (
                  <>
                    <label
                      htmlFor={`exam-group-score-${group.id}`}
                      className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      Puntaje máximo
                    </label>
                    <input
                      id={`exam-group-score-${group.id}`}
                      type="number"
                      min="0"
                      max={scoringScale}
                      step="0.01"
                      value={group.puntajeMaximo ?? ""}
                      onChange={(event) =>
                        updateGroup(groupIndex, {
                          ...group,
                          puntajeMaximo: event.target.value,
                        })
                      }
                      onBlur={() =>
                        onBlur(`preguntas.${groupIndex}.puntajeMaximo`)
                      }
                      onWheel={(event) => event.currentTarget.blur()}
                      aria-invalid={Boolean(
                        errors[`preguntas.${groupIndex}.puntajeMaximo`],
                      )}
                      aria-describedby={
                        errors[`preguntas.${groupIndex}.puntajeMaximo`]
                          ? `exam-group-score-${group.id}-error`
                          : undefined
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <FormFieldError
                      id={`exam-group-score-${group.id}-error`}
                      message={errors[`preguntas.${groupIndex}.puntajeMaximo`]}
                    />
                  </>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Puntaje
                    </span>
                    <span className="text-sm font-black text-slate-700">
                      {equalScores[groupIndex] ?? "0"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {group.bankReference ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    Grupo guardado en banco
                  </span>
                ) : onSaveGroupToBank ? (
                  <button
                    type="button"
                    onClick={() => onSaveGroupToBank(groupIndex)}
                    disabled={Boolean(savingTarget)}
                    className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {savingTarget === `group-${groupIndex}` ? "Guardando..." : "Guardar grupo en banco"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onChange(groups.filter((_, index) => index !== groupIndex))}
                  aria-label={`Eliminar grupo ${groupIndex + 1}`}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>

            {group.variantes.map((variant, variantIndex) => (
              <QuestionContentEditor
                key={variant.id}
                value={variant}
                label={`Variante ${variantIndex + 1}`}
                fieldPrefix={`preguntas.${groupIndex}.variantes.${variantIndex}`}
                errors={errors}
                onBlur={onBlur}
                onChange={(nextVariant) =>
                  updateGroup(groupIndex, {
                    ...group,
                    variantes: group.variantes.map((item, index) =>
                      index === variantIndex ? nextVariant : item,
                    ),
                  })
                }
                onRemove={
                  group.variantes.length > 1
                    ? () =>
                        updateGroup(groupIndex, {
                          ...group,
                          variantes: group.variantes.filter(
                            (_, index) => index !== variantIndex,
                          ),
                        })
                    : undefined
                }
                actions={
                  variant.bankReference ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                      En banco
                    </span>
                  ) : onSaveVariantToBank ? (
                    <button
                      type="button"
                      onClick={() => onSaveVariantToBank(groupIndex, variantIndex)}
                      disabled={Boolean(savingTarget)}
                      className="rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      {savingTarget === `variant-${groupIndex}-${variantIndex}`
                        ? "Guardando..."
                        : "Guardar en banco"}
                    </button>
                  ) : null
                }
              />
            ))}

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() =>
                  updateGroup(groupIndex, {
                    ...group,
                    variantes: [...group.variantes, emptyVariant()],
                  })
                }
                className="rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                + Agregar variante aleatoria
              </button>
            </div>
          </article>
        );
      })}
      <FormFieldError id="exam-groups-error" message={errors.preguntas} />
      <div className="flex justify-center border-t border-slate-200 pt-5">
        <Button
          type="button"
          onClick={addGroup}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          + Añadir Pregunta Estructural
        </Button>
      </div>
    </section>
  );
}
