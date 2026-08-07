import type { GuardarEvaluacionPayload } from "@/types/index";
import type { ExamFormValues } from "@/lib/schemas/examSchema";

export function toGuardarEvaluacionPayload(
  form: ExamFormValues,
  recursosPermitidos: string,
): GuardarEvaluacionPayload {
  return {
    Titulo: form.titulo,
    Descripcion: form.descripcion || undefined,
    Tipo: "evaluacion",
    CantidadIntentosMaximos: Number(form.cantidadIntentos),
    FechaInicio: new Date(form.fechaInicio).toISOString(),
    FechaFin: new Date(form.fechaFin).toISOString(),
    IdMateriaDivision: Number(form.idMateriaDivision),
    DuracionMinutos:
      form.duracionMinutos === "" ? null : Number(form.duracionMinutos),
    RecursosPermitidos: recursosPermitidos || undefined,
    GruposPreguntas: form.preguntas.map((group) => ({
      TituloReferencia: group.tituloReferencia,
      Variantes: group.variantes.map((variant) => ({
        Enunciado: variant.enunciado,
        Tipo: variant.tipo,
        Opciones: variant.opciones?.map((option) => ({
          Texto: option.texto,
          EsCorrecta: option.esCorrecta,
        })),
      })),
    })),
  };
}
