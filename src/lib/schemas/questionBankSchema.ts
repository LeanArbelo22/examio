import { z } from "zod";

const estadoBancoSchema = z.enum(["borrador", "disponible", "archivado"]);
const tipoPreguntaSchema = z.enum(["mc", "multiple", "vf", "abierta", "code"]);

const bankOptionSchema = z.object({
  texto: z.string().max(500, "La opción no puede superar los 500 caracteres."),
  esCorrecta: z.boolean(),
});

export const bankQuestionFormSchema = z
  .object({
    titulo: z
      .string()
      .trim()
      .min(1, "Ingresá un título para identificar la pregunta.")
      .max(150, "El título no puede superar los 150 caracteres."),
    enunciado: z
      .string()
      .max(100_000, "El enunciado es demasiado extenso."),
    tipo: tipoPreguntaSchema,
    modoJustificacion: z
      .enum(["sin_justificacion", "opcional", "obligatoria"])
      .optional(),
    estrategiaCorreccion: z
      .enum(["exacta", "parcial_sin_penalizacion", "parcial_penalizada"])
      .optional(),
    tratamientoJustificacion: z
      .enum(["informativa", "revision_manual"])
      .optional(),
    estado: estadoBancoSchema,
    opciones: z.array(bankOptionSchema).max(100),
    etiquetas: z.array(z.number().int().positive()).max(200),
  })
  .superRefine((question, context) => {
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

    if (question.estado !== "disponible") return;

    if (!question.enunciado.trim()) {
      context.addIssue({
        code: "custom",
        path: ["enunciado"],
        message: "Una pregunta disponible necesita enunciado.",
      });
    }

    const correctAnswers = question.opciones.filter(
      (option) => option.esCorrecta,
    ).length;
    if (
      question.tipo === "mc" &&
      (question.opciones.length < 2 ||
        question.opciones.some((option) => !option.texto.trim()) ||
        correctAnswers !== 1)
    ) {
      context.addIssue({
        code: "custom",
        path: ["opciones"],
        message: "Selección única requiere dos opciones completas y una correcta.",
      });
    }

    if (
      question.tipo === "multiple" &&
      (question.opciones.length < 2 ||
        question.opciones.some((option) => !option.texto.trim()) ||
        correctAnswers < 1)
    ) {
      context.addIssue({
        code: "custom",
        path: ["opciones"],
        message: "Selección múltiple requiere dos opciones completas y al menos una correcta.",
      });
    }

    if (question.tipo === "vf") {
      const labels = question.opciones.map((option) =>
        option.texto.trim().toLowerCase(),
      );
      if (
        question.opciones.length !== 2 ||
        !labels.includes("verdadero") ||
        !labels.includes("falso") ||
        new Set(labels).size !== 2 ||
        correctAnswers !== 1
      ) {
        context.addIssue({
          code: "custom",
          path: ["opciones"],
          message: "Verdadero/Falso requiere ambas opciones y una correcta.",
        });
      }
    }

    if (
      (question.tipo === "abierta" || question.tipo === "code") &&
      question.opciones.length > 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["opciones"],
        message: "Este tipo no admite opciones.",
      });
    }

    if (question.tipo === "code") {
      context.addIssue({
        code: "custom",
        path: ["estado"],
        message: "Las preguntas de código solo pueden conservarse como borrador.",
      });
    }
  });

export const bankGroupFormSchema = z.object({
  tituloReferencia: z
    .string()
    .trim()
    .min(1, "Ingresá un título para el grupo.")
    .max(150, "El título no puede superar los 150 caracteres."),
  estado: estadoBancoSchema,
  preguntas: z.array(z.number().int().positive()).max(200),
  etiquetas: z.array(z.number().int().positive()).max(200),
});

export type BankQuestionFormValues = z.infer<typeof bankQuestionFormSchema>;
export type BankGroupFormValues = z.infer<typeof bankGroupFormSchema>;
