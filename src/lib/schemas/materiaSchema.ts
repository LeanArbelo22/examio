import { z } from "zod";

export const materiaFormSchema = z
  .object({
    Nombre: z
      .string()
      .trim()
      .min(1, "Ingresá el nombre de la materia.")
      .max(100, "El nombre no puede superar los 100 caracteres."),
    Semestre: z
      .string()
      .regex(/^\d+$/, "Ingresá un semestre entero.")
      .refine((value) => Number(value) >= 1, "El semestre debe ser mayor o igual a 1."),
    IdCarrera: z
      .string()
      .regex(/^\d+$/, "Seleccioná una carrera.")
      .refine((value) => Number(value) > 0, "Seleccioná una carrera."),
  })
  .transform((form) => ({
    Nombre: form.Nombre,
    Semestre: Number(form.Semestre),
    IdCarrera: Number(form.IdCarrera),
  }));

export type MateriaFormInput = z.input<typeof materiaFormSchema>;
