import { z } from "zod";

// validación para el formulario de inicio de sesión
export const loginSchema = z.object({
  email: z
    .string()
    .email("Correo inválido") // valida que el formato del correo sea correcto
    .regex(
      /@(isc|cervantes)\.(com|edu)\.ar$/i, // restringe a correos institucionales
      "Solo se permiten correos institucionales"
    )
    .transform((email) => email.toLowerCase()), // convierte el correo a minúsculas
  password: z
    .string()
    .min(6, "Mínimo 6 caracteres") // longitud de la contraseña
    .max(50, "Máximo 50 caracteres"), 
});

// exporta el tipo de los valores del esquema
export type LoginFormValues = z.infer<typeof loginSchema>;