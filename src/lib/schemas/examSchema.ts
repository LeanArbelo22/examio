import { z } from "zod";

const optionSchema = z.object({
  texto: z.string().trim().min(1, "Escribí el texto de la opción."),
  esCorrecta: z.boolean(),
});

const variantSchema = z
  .object({
    id: z.string().min(1),
    enunciado: z.string().trim().min(1, "Escribí el enunciado."),
    tipo: z.enum(["mc", "vf", "abierta", "code"]),
    opciones: z.array(optionSchema).optional(),
  })
  .superRefine((variant, context) => {
    if (variant.tipo !== "mc" && variant.tipo !== "vf") return;
    const options = variant.opciones ?? [];
    if (options.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["opciones"],
        message: "Agregá al menos dos opciones.",
      });
    }
    if (options.filter((option) => option.esCorrecta).length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["opciones"],
        message: "Marcá exactamente una opción correcta.",
      });
    }
  });

const questionGroupSchema = z.object({
  id: z.number().int().positive(),
  tituloReferencia: z
    .string()
    .trim()
    .min(1, "Escribí un título para el grupo."),
  variantes: z
    .array(variantSchema)
    .min(1, "El grupo debe contener al menos una variante."),
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

export const examFormSchema = z
  .object({
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
export type ExamQuestionGroup = ExamFormValues["preguntas"][number];

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
