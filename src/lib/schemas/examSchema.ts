import { z } from "zod";

const optionSchema = z.object({
  persistedId: z.number().int().positive().optional(),
  texto: z
    .string()
    .trim()
    .min(1, "Escribí el texto de la opción.")
    .max(500, "La opción no puede superar los 500 caracteres."),
  esCorrecta: z.boolean(),
});

const draftOptionSchema = z.object({
  persistedId: z.number().int().positive().optional(),
  texto: z.string().max(500, "La opción no puede superar los 500 caracteres."),
  esCorrecta: z.boolean(),
});

const bankReferenceSchema = z.object({
  id: z.number().int().positive(),
  revision: z.number().int().positive(),
});

const questionConfigurationFields = {
  modoJustificacion: z
    .enum(["sin_justificacion", "opcional", "obligatoria"])
    .optional(),
  estrategiaCorreccion: z
    .enum(["exacta", "parcial_sin_penalizacion", "parcial_penalizada"])
    .optional(),
  tratamientoJustificacion: z
    .enum(["informativa", "revision_manual"])
    .optional(),
};

function validateQuestionConfiguration(
  question: {
    tipo: "mc" | "multiple" | "vf" | "abierta" | "code";
    modoJustificacion?: "sin_justificacion" | "opcional" | "obligatoria";
    estrategiaCorreccion?:
      | "exacta"
      | "parcial_sin_penalizacion"
      | "parcial_penalizada";
    tratamientoJustificacion?: "informativa" | "revision_manual";
  },
  context: z.RefinementCtx,
) {
  if (
    (question.tipo === "abierta" || question.tipo === "code") &&
    (question.modoJustificacion ?? "sin_justificacion") !==
      "sin_justificacion"
  ) {
    context.addIssue({
      code: "custom",
      path: ["modoJustificacion"],
      message: "Este tipo de pregunta no admite justificación adicional.",
    });
  }
  if (
    question.tipo !== "multiple" &&
    (question.estrategiaCorreccion ?? "exacta") !== "exacta"
  ) {
    context.addIssue({
      code: "custom",
      path: ["estrategiaCorreccion"],
      message: "La corrección parcial solo está disponible para selección múltiple.",
    });
  }
  if (
    (question.modoJustificacion ?? "sin_justificacion") ===
      "sin_justificacion" &&
    (question.tratamientoJustificacion ?? "informativa") !== "informativa"
  ) {
    context.addIssue({
      code: "custom",
      path: ["tratamientoJustificacion"],
      message: "Habilitá una justificación antes de solicitar revisión docente.",
    });
  }
  if (
    (question.tipo === "abierta" || question.tipo === "code") &&
    (question.tratamientoJustificacion ?? "informativa") !== "informativa"
  ) {
    context.addIssue({
      code: "custom",
      path: ["tratamientoJustificacion"],
      message: "Las respuestas a desarrollar ya requieren corrección docente.",
    });
  }
}

const scoreInputSchema = z
  .string()
  .max(20, "El puntaje es demasiado extenso.");

const scoringFields = {
  escalaCalificacion: z.union([z.literal(10), z.literal(100)]).optional(),
  notaAprobacion: scoreInputSchema.optional(),
  modoPuntaje: z.enum(["iguales", "personalizados"]).optional(),
  mostrarPuntajePorPregunta: z.boolean().optional(),
  correccionAutomaticaCerradas: z.boolean().optional(),
};

function isDecimalScore(value: string) {
  return /^\d+(?:\.\d{1,2})?$/.test(value);
}

function validateScoring(
  form: {
    escalaCalificacion?: 10 | 100;
    notaAprobacion?: string;
    modoPuntaje?: "iguales" | "personalizados";
    preguntas: { puntajeMaximo?: string }[];
  },
  context: z.RefinementCtx,
  requireCompleteScores: boolean,
) {
  const scale = form.escalaCalificacion ?? 10;
  const passingGrade = form.notaAprobacion ?? "4";
  if (!isDecimalScore(passingGrade) || Number(passingGrade) > scale) {
    context.addIssue({
      code: "custom",
      path: ["notaAprobacion"],
      message: `La nota de aprobación debe estar entre 0 y ${scale}, con hasta dos decimales.`,
    });
  }

  if ((form.modoPuntaje ?? "iguales") !== "personalizados") return;

  let allScoresValid = true;
  let totalCents = 0;
  form.preguntas.forEach((group, index) => {
    const value = group.puntajeMaximo?.trim() ?? "";
    if (!value) {
      if (requireCompleteScores) {
        allScoresValid = false;
        context.addIssue({
          code: "custom",
          path: ["preguntas", index, "puntajeMaximo"],
          message: "Asigná un puntaje máximo a este grupo.",
        });
      }
      return;
    }
    if (!isDecimalScore(value) || Number(value) > scale) {
      allScoresValid = false;
      context.addIssue({
        code: "custom",
        path: ["preguntas", index, "puntajeMaximo"],
        message: `Ingresá un valor entre 0 y ${scale}, con hasta dos decimales.`,
      });
      return;
    }
    totalCents += Math.round(Number(value) * 100);
  });

  if (requireCompleteScores && allScoresValid && totalCents !== scale * 100) {
    context.addIssue({
      code: "custom",
      path: ["puntajesPersonalizados"],
      message: `La suma de los puntajes debe ser exactamente ${scale}.`,
    });
  }
}

const variantSchema = z
  .object({
    id: z.string().min(1),
    persistedId: z.number().int().positive().optional(),
    bankReference: bankReferenceSchema.optional(),
    enunciado: z
      .string()
      .trim()
      .min(1, "Escribí el enunciado.")
      .max(100_000, "El enunciado es demasiado extenso."),
    tipo: z.enum(["mc", "multiple", "vf", "abierta", "code"]),
    ...questionConfigurationFields,
    opciones: z.array(optionSchema).optional(),
  })
  .superRefine((variant, context) => {
    validateQuestionConfiguration(variant, context);
    const options = variant.opciones ?? [];
    if (
      (variant.tipo === "abierta" || variant.tipo === "code") &&
      options.length > 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["opciones"],
        message: "Este tipo de pregunta no admite opciones.",
      });
      return;
    }
    if (
      variant.tipo !== "mc" &&
      variant.tipo !== "multiple" &&
      variant.tipo !== "vf"
    ) {
      return;
    }
    if (
      (variant.tipo === "vf" && options.length !== 2) ||
      (variant.tipo !== "vf" && options.length < 2)
    ) {
      context.addIssue({
        code: "custom",
        path: ["opciones"],
        message:
          variant.tipo === "vf"
            ? "Verdadero/Falso requiere exactamente dos opciones."
            : "Agregá al menos dos opciones.",
      });
    }
    if (variant.tipo === "vf") {
      const labels = options.map((option) => option.texto.toLowerCase());
      if (
        !labels.includes("verdadero") ||
        !labels.includes("falso") ||
        new Set(labels).size !== 2
      ) {
        context.addIssue({
          code: "custom",
          path: ["opciones"],
          message: "Verdadero/Falso requiere las opciones Verdadero y Falso.",
        });
      }
    }
    const correctAnswers = options.filter((option) => option.esCorrecta).length;
    if (variant.tipo === "multiple" ? correctAnswers < 1 : correctAnswers !== 1) {
      context.addIssue({
        code: "custom",
        path: ["opciones"],
        message:
          variant.tipo === "multiple"
            ? "Marcá al menos una opción correcta."
            : "Marcá exactamente una opción correcta.",
      });
    }
  });

const draftVariantSchema = z
  .object({
    id: z.string().min(1),
    persistedId: z.number().int().positive().optional(),
    bankReference: bankReferenceSchema.optional(),
    enunciado: z
      .string()
      .max(100_000, "El enunciado es demasiado extenso."),
    tipo: z.enum(["mc", "multiple", "vf", "abierta", "code"]),
    ...questionConfigurationFields,
    opciones: z.array(draftOptionSchema).max(100).optional(),
  })
  .superRefine(validateQuestionConfiguration);

const questionGroupSchema = z.object({
  id: z.number().int().positive(),
  persistedId: z.number().int().positive().optional(),
  bankReference: bankReferenceSchema.optional(),
  tituloReferencia: z
    .string()
    .trim()
    .min(1, "Escribí un título para el grupo."),
  puntajeMaximo: scoreInputSchema.optional(),
  variantes: z
    .array(variantSchema)
    .min(1, "El grupo debe contener al menos una variante.")
    .max(200),
});

const draftQuestionGroupSchema = z.object({
  id: z.number().int().positive(),
  persistedId: z.number().int().positive().optional(),
  bankReference: bankReferenceSchema.optional(),
  tituloReferencia: z
    .string()
    .max(150, "El título del grupo no puede superar los 150 caracteres."),
  puntajeMaximo: scoreInputSchema.optional(),
  variantes: z.array(draftVariantSchema).max(200),
});

function validLocalDate(value: string) {
  return value !== "" && Number.isFinite(new Date(value).getTime());
}

function logicalYear(value: string) {
  if (!validLocalDate(value)) return true;
  const year = new Date(value).getFullYear();
  const currentYear = new Date().getFullYear();
  return year >= currentYear && year <= currentYear + 10;
}

function logicalDraftYear(value: string) {
  if (!validLocalDate(value)) return true;
  const year = new Date(value).getFullYear();
  const currentYear = new Date().getFullYear();
  return year >= currentYear - 10 && year <= currentYear + 10;
}

const draftFormSchemaBase = z.object({
  ...scoringFields,
  titulo: z
    .string()
    .trim()
    .min(1, "Ingresá un título para la evaluación.")
    .max(150, "El título no puede superar los 150 caracteres."),
  descripcion: z
    .string()
    .trim()
    .max(1000, "La descripción no puede superar los 1000 caracteres."),
  idMateriaDivision: z
    .string()
    .regex(/^\d+$/, "Seleccioná una comisión válida.")
    .refine((value) => Number(value) > 0, "Seleccioná una comisión válida."),
  duracionMinutos: z
    .string()
    .refine(
      (value) => value === "" || /^\d+$/.test(value),
      "La duración debe ser un número entero.",
    )
    .refine(
      (value) => value === "" || Number(value) >= 1,
      "La duración debe ser mayor o igual a 1 minuto.",
    ),
  cantidadIntentos: z
    .string()
    .regex(/^\d+$/, "Ingresá una cantidad entera de intentos.")
    .refine(
      (value) => Number(value) >= 1 && Number(value) <= 10,
      "La cantidad de intentos debe estar entre 1 y 10.",
    ),
  fechaInicio: z
    .string()
    .refine(validLocalDate, "Configurá una fecha de apertura válida.")
    .refine(logicalDraftYear, "La fecha debe estar dentro de una ventana de 10 años."),
  fechaFin: z
    .string()
    .refine(validLocalDate, "Configurá una fecha de cierre válida.")
    .refine(logicalDraftYear, "La fecha debe estar dentro de una ventana de 10 años."),
  preguntas: z.array(draftQuestionGroupSchema).max(100),
});

export const examDraftFormSchema = draftFormSchemaBase.superRefine(
  (form, context) => {
    validateScoring(form, context, false);
    if (
      validLocalDate(form.fechaInicio) &&
      validLocalDate(form.fechaFin) &&
      new Date(form.fechaFin) <= new Date(form.fechaInicio)
    ) {
      context.addIssue({
        code: "custom",
        path: ["fechaFin"],
        message: "El cierre debe ser posterior a la apertura.",
      });
    }
  },
);

export const examFormSchema = z
  .object({
    ...scoringFields,
    titulo: z
      .string()
      .trim()
      .min(1, "Ingresá un título para la evaluación.")
      .max(150, "El título no puede superar los 150 caracteres."),
    descripcion: z
      .string()
      .trim()
      .max(1000, "La descripción no puede superar los 1000 caracteres."),
    idMateriaDivision: z
      .string()
      .regex(/^\d+$/, "Seleccioná una comisión válida.")
      .refine((value) => Number(value) > 0, "Seleccioná una comisión válida."),
    duracionMinutos: z
      .string()
      .refine(
        (value) => value === "" || /^\d+$/.test(value),
        "La duración debe ser un número entero.",
      )
      .refine(
        (value) => value === "" || Number(value) >= 1,
        "La duración debe ser mayor o igual a 1 minuto.",
      ),
    cantidadIntentos: z
      .string()
      .regex(/^\d+$/, "Ingresá una cantidad entera de intentos.")
      .refine(
        (value) => Number(value) >= 1 && Number(value) <= 10,
        "La cantidad de intentos debe estar entre 1 y 10.",
      ),
    fechaInicio: z
      .string()
      .refine(validLocalDate, "Configurá una fecha de apertura válida.")
      .refine(logicalYear, "La fecha debe estar dentro de los próximos 10 años."),
    fechaFin: z
      .string()
      .refine(validLocalDate, "Configurá una fecha de cierre válida.")
      .refine(logicalYear, "La fecha debe estar dentro de los próximos 10 años."),
    preguntas: z
      .array(questionGroupSchema)
      .min(1, "El examen debe contener al menos un grupo de preguntas."),
  })
  .superRefine((form, context) => {
    validateScoring(form, context, true);
    if (validLocalDate(form.fechaInicio)) {
      const oneMinuteAgo = Date.now() - 60_000;
      if (new Date(form.fechaInicio).getTime() < oneMinuteAgo) {
        context.addIssue({
          code: "custom",
          path: ["fechaInicio"],
          message: "La apertura no puede ser anterior al momento actual.",
        });
      }
    }
    if (
      validLocalDate(form.fechaInicio) &&
      validLocalDate(form.fechaFin) &&
      new Date(form.fechaFin) <= new Date(form.fechaInicio)
    ) {
      context.addIssue({
        code: "custom",
        path: ["fechaFin"],
        message: "El cierre debe ser posterior a la apertura.",
      });
    }
  });

export type ExamFormValues = z.infer<typeof examFormSchema>;
export type ExamDraftFormValues = z.infer<typeof examDraftFormSchema>;
export type ExamQuestionGroup = ExamDraftFormValues["preguntas"][number];
export type ExamQuestionVariant = ExamQuestionGroup["variantes"][number];

export function defaultExamSchedule() {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 5);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const toLocalInput = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
  return { fechaInicio: toLocalInput(start), fechaFin: toLocalInput(end) };
}
