import type {
  BancoGrupoDesdeContenidoPayload,
  BancoGrupoDesdeContenidoResultado,
  BancoGrupoDetalle,
  BancoImportacionPayload,
  BancoPreguntaDetalle,
  BancoPreguntaListado,
  BancoPreguntaPayload,
} from "@/types";
import type {
  ExamQuestionGroup,
  ExamQuestionVariant,
} from "@/lib/schemas/examSchema";

export interface PendingBankImport {
  key: string;
  kind: "pregunta" | "grupo";
  label: string;
  questionIds: number[];
  payload: BancoImportacionPayload;
}

export class BankSelectionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BankSelectionConflictError";
  }
}

export function buildPendingBankImports(
  questions: BancoPreguntaListado[],
  groups: BancoGrupoDetalle[],
  excludedQuestionIds: Iterable<number> = [],
  excludedGroupIds: Iterable<number> = [],
): PendingBankImport[] {
  const usedQuestions = new Set(excludedQuestionIds);
  const usedGroups = new Set(excludedGroupIds);
  const imports: PendingBankImport[] = [];

  for (const question of questions) {
    if (usedQuestions.has(question.id)) {
      throw new BankSelectionConflictError(
        `La pregunta “${question.titulo}” ya está incluida en la evaluación o en otra selección.`,
      );
    }
    usedQuestions.add(question.id);
    imports.push({
      key: `pregunta-${question.id}`,
      kind: "pregunta",
      label: question.titulo,
      questionIds: [question.id],
      payload: {
        Tipo: "pregunta",
        IdPregunta: question.id,
        RevisionEsperada: question.revision,
        TituloReferencia: question.titulo,
      },
    });
  }

  for (const group of groups) {
    if (usedGroups.has(group.id)) {
      throw new BankSelectionConflictError(
        `El grupo “${group.tituloReferencia}” ya está incluido en la evaluación.`,
      );
    }
    const duplicate = group.preguntas.find((question) =>
      usedQuestions.has(question.id),
    );
    if (duplicate) {
      throw new BankSelectionConflictError(
        `“${duplicate.titulo}” aparece en más de una selección. Quitá la pregunta o uno de los grupos antes de continuar.`,
      );
    }
    usedGroups.add(group.id);
    group.preguntas.forEach((question) => usedQuestions.add(question.id));
    imports.push({
      key: `grupo-${group.id}`,
      kind: "grupo",
      label: group.tituloReferencia,
      questionIds: group.preguntas.map((question) => question.id),
      payload: {
        Tipo: "grupo",
        IdGrupo: group.id,
        RevisionEsperada: group.revision,
        Preguntas: group.preguntas.map((question) => ({
          IdPregunta: question.id,
          RevisionEsperada: question.revision,
        })),
      },
    });
  }

  return imports;
}

function questionTitle(
  group: ExamQuestionGroup,
  variant: ExamQuestionVariant,
  variantIndex: number,
) {
  return (
    group.tituloReferencia.trim() ||
    variant.enunciado.trim().slice(0, 150) ||
    `Pregunta ${variantIndex + 1}`
  );
}

export function toBankQuestionPayload(
  group: ExamQuestionGroup,
  variant: ExamQuestionVariant,
  variantIndex: number,
): BancoPreguntaPayload {
  return {
    Titulo: questionTitle(group, variant, variantIndex),
    Enunciado: variant.enunciado,
    Tipo: variant.tipo,
    ModoJustificacion: variant.modoJustificacion ?? "sin_justificacion",
    EstrategiaCorreccion: variant.estrategiaCorreccion ?? "exacta",
    TratamientoJustificacion:
      variant.tratamientoJustificacion ?? "informativa",
    Estado: "borrador",
    Opciones: (variant.opciones ?? []).map((option) => ({
      Texto: option.texto,
      EsCorrecta: option.esCorrecta,
    })),
    Etiquetas: [],
  };
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stableClientKey(variant: ExamQuestionVariant, variantIndex: number) {
  if (uuidPattern.test(variant.id)) return variant.id;
  const numericSeed = variant.persistedId ?? variantIndex + 1;
  return `00000000-0000-4000-8000-${numericSeed
    .toString(16)
    .padStart(12, "0")
    .slice(-12)}`;
}

export function toBankGroupPayload(
  group: ExamQuestionGroup,
): BancoGrupoDesdeContenidoPayload {
  return {
    TituloReferencia:
      group.tituloReferencia.trim() || `Grupo de preguntas ${group.id}`,
    Etiquetas: [],
    Preguntas: group.variantes.map((variant, index) => {
      if (variant.bankReference) {
        return {
            Origen: "existente" as const,
            IdPregunta: variant.bankReference.id,
            RevisionEsperada: variant.bankReference.revision,
          };
      }
      const source = toBankQuestionPayload(
        group,
        variant,
        index,
      );
      return {
        Origen: "nueva" as const,
        ClaveCliente: stableClientKey(variant, index),
        Pregunta: {
          Titulo: source.Titulo,
          Enunciado: source.Enunciado,
          Tipo: source.Tipo,
          ModoJustificacion: source.ModoJustificacion,
          EstrategiaCorreccion: source.EstrategiaCorreccion,
          TratamientoJustificacion: source.TratamientoJustificacion,
          Opciones: source.Opciones,
          Etiquetas: source.Etiquetas,
        },
      };
    }),
  };
}

export function withSavedQuestionReference(
  groups: ExamQuestionGroup[],
  groupIndex: number,
  variantIndex: number,
  saved: Pick<BancoPreguntaDetalle, "id" | "revision">,
) {
  return groups.map((group, currentGroupIndex) =>
    currentGroupIndex !== groupIndex
      ? group
      : {
          ...group,
          variantes: group.variantes.map((variant, currentVariantIndex) =>
            currentVariantIndex !== variantIndex
              ? variant
              : {
                  ...variant,
                  bankReference: { id: saved.id, revision: saved.revision },
                },
          ),
        },
  );
}

export function withSavedGroupReferences(
  groups: ExamQuestionGroup[],
  groupIndex: number,
  payload: BancoGrupoDesdeContenidoPayload,
  saved: BancoGrupoDesdeContenidoResultado,
) {
  const references = new Map(
    saved.preguntas.map((question) => [question.claveCliente, question]),
  );
  return groups.map((group, currentGroupIndex) => {
    if (currentGroupIndex !== groupIndex) return group;
    return {
      ...group,
      bankReference: {
        id: saved.grupo.id,
        revision: saved.grupo.revision,
      },
      variantes: group.variantes.map((variant, variantIndex) => {
        if (variant.bankReference) return variant;
        const item = payload.Preguntas[variantIndex];
        if (item?.Origen !== "nueva") return variant;
        const reference = references.get(item.ClaveCliente);
        return reference
          ? {
              ...variant,
              bankReference: {
                id: reference.id,
                revision: reference.revision,
              },
            }
          : variant;
      }),
    };
  });
}
