import type {
  BancoImportacionPayload,
  EvaluacionDetalle,
  GuardarEvaluacionPayload,
  ModificarBorradorPayload,
  PublicarEvaluacionPayload,
} from "@/types/index";
import type { ExamDraftFormValues } from "@/lib/schemas/examSchema";
import { normalizeQuestionConfiguration } from "@/lib/question-configuration";

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function toGuardarEvaluacionPayload(
  form: ExamDraftFormValues,
  recursosPermitidos: string,
  estado?: "borrador" | "publicada",
  importacionesBanco?: BancoImportacionPayload[],
): GuardarEvaluacionPayload {
  return {
    Titulo: form.titulo,
    Descripcion: form.descripcion || undefined,
    Tipo: "evaluacion",
    CantidadIntentosMaximos: Number(form.cantidadIntentos),
    FechaInicio: new Date(form.fechaInicio).toISOString(),
    FechaFin: new Date(form.fechaFin).toISOString(),
    Estado: estado,
    EscalaCalificacion: form.escalaCalificacion ?? 10,
    NotaAprobacion: Number(form.notaAprobacion ?? "4"),
    ModoPuntaje: form.modoPuntaje ?? "iguales",
    MostrarPuntajePorPregunta: form.mostrarPuntajePorPregunta ?? false,
    CorreccionAutomaticaCerradas:
      form.correccionAutomaticaCerradas ?? true,
    IdMateriaDivision: Number(form.idMateriaDivision),
    DuracionMinutos:
      form.duracionMinutos === "" ? null : Number(form.duracionMinutos),
    RecursosPermitidos: recursosPermitidos || undefined,
    ImportacionesBanco:
      importacionesBanco && importacionesBanco.length > 0
        ? importacionesBanco
        : undefined,
    GruposPreguntas: form.preguntas.map((group) => ({
      Id: group.persistedId,
      ReferenciaBanco: group.bankReference
        ? {
            IdGrupo: group.bankReference.id,
            RevisionEsperada: group.bankReference.revision,
          }
        : undefined,
      TituloReferencia: group.tituloReferencia,
      PuntajeMaximo:
        (form.modoPuntaje ?? "iguales") === "personalizados" &&
        group.puntajeMaximo?.trim()
          ? Number(group.puntajeMaximo)
          : undefined,
      Variantes: group.variantes.map((variant) => ({
        Id: variant.persistedId,
        ReferenciaBanco: variant.bankReference
          ? {
              IdPregunta: variant.bankReference.id,
              RevisionEsperada: variant.bankReference.revision,
            }
          : undefined,
        Enunciado: variant.enunciado,
        Tipo: variant.tipo,
        ModoJustificacion:
          variant.modoJustificacion ?? "sin_justificacion",
        EstrategiaCorreccion: variant.estrategiaCorreccion ?? "exacta",
        TratamientoJustificacion:
          variant.tratamientoJustificacion ?? "informativa",
        Opciones: variant.opciones?.map((option) => ({
          Id: option.persistedId,
          Texto: option.texto,
          EsCorrecta: option.esCorrecta,
        })),
      })),
    })),
  };
}

export function toModificarBorradorPayload(
  form: ExamDraftFormValues,
  recursosPermitidos: string,
  idPublicacion: number,
  revision: number,
  importacionesBanco?: BancoImportacionPayload[],
): ModificarBorradorPayload {
  const base = toGuardarEvaluacionPayload(
    form,
    recursosPermitidos,
    undefined,
    importacionesBanco,
  );
  const payload = { ...base };
  delete payload.Estado;
  return {
    ...payload,
    IdPublicacion: idPublicacion,
    RevisionEsperada: revision,
  };
}

export function toPublicarEvaluacionPayload(
  form: ExamDraftFormValues,
  recursosPermitidos: string,
  idPublicacion: number,
  revision: number,
  guardarTodoEnBanco: boolean,
  importacionesBanco?: BancoImportacionPayload[],
): PublicarEvaluacionPayload {
  return {
    ...toModificarBorradorPayload(
      form,
      recursosPermitidos,
      idPublicacion,
      revision,
      importacionesBanco,
    ),
    GuardarTodoEnBanco: guardarTodoEnBanco,
  };
}

export function fromEvaluacionDetalle(
  detalle: EvaluacionDetalle,
  idMateriaDivision: number,
): ExamDraftFormValues {
  return {
    titulo: detalle.titulo,
    descripcion: detalle.descripcion ?? "",
    idMateriaDivision: String(idMateriaDivision),
    duracionMinutos:
      detalle.duracionMinutos == null ? "" : String(detalle.duracionMinutos),
    cantidadIntentos: String(detalle.cantidadIntentosMaximos),
    escalaCalificacion: detalle.escalaCalificacion,
    notaAprobacion: String(detalle.notaAprobacion),
    modoPuntaje: detalle.modoPuntaje,
    mostrarPuntajePorPregunta: detalle.mostrarPuntajePorPregunta,
    correccionAutomaticaCerradas: detalle.correccionAutomaticaCerradas,
    fechaInicio: toLocalDateTimeInput(detalle.fechaInicio),
    fechaFin: toLocalDateTimeInput(detalle.fechaFin),
    preguntas: detalle.grupos.map((group, groupIndex) => ({
      id: groupIndex + 1,
      persistedId: group.idGrupo,
      bankReference:
        group.idBancoGrupoOrigen && group.revisionBancoOrigen
          ? {
              id: group.idBancoGrupoOrigen,
              revision: group.revisionBancoOrigen,
            }
          : undefined,
      tituloReferencia: group.tituloReferencia,
      puntajeMaximo:
        group.puntajeMaximo == null ? "" : String(group.puntajeMaximo),
      variantes: group.preguntas.map((question) => ({
        id: `question-${question.idPregunta}`,
        persistedId: question.idPregunta,
        bankReference:
          question.idBancoPreguntaOrigen && question.revisionBancoOrigen
            ? {
                id: question.idBancoPreguntaOrigen,
                revision: question.revisionBancoOrigen,
              }
            : undefined,
        enunciado: question.enunciado,
        tipo: question.tipo,
        ...normalizeQuestionConfiguration(question.tipo, question),
        opciones: question.opciones.map((option) => ({
          persistedId: option.idOpcion,
          texto: option.texto,
          esCorrecta: option.esCorrecta,
        })),
      })),
    })),
  };
}
