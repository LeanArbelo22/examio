import type {
  EstrategiaCorreccion,
  ModoJustificacion,
  TipoPregunta,
  TratamientoJustificacion,
} from "@/types";

export interface QuestionConfiguration {
  modoJustificacion: ModoJustificacion;
  estrategiaCorreccion: EstrategiaCorreccion;
  tratamientoJustificacion: TratamientoJustificacion;
}

export const DEFAULT_QUESTION_CONFIGURATION: QuestionConfiguration = {
  modoJustificacion: "sin_justificacion",
  estrategiaCorreccion: "exacta",
  tratamientoJustificacion: "informativa",
};

export function normalizeQuestionConfiguration(
  tipo: TipoPregunta,
  configuration: Partial<QuestionConfiguration>,
): QuestionConfiguration {
  const supportsJustification =
    tipo === "mc" || tipo === "multiple" || tipo === "vf";
  const modoJustificacion = supportsJustification
    ? (configuration.modoJustificacion ??
      DEFAULT_QUESTION_CONFIGURATION.modoJustificacion)
    : "sin_justificacion";

  return {
    modoJustificacion,
    estrategiaCorreccion:
      tipo === "multiple"
        ? (configuration.estrategiaCorreccion ?? "exacta")
        : "exacta",
    tratamientoJustificacion:
      modoJustificacion === "sin_justificacion"
        ? "informativa"
        : (configuration.tratamientoJustificacion ?? "informativa"),
  };
}
