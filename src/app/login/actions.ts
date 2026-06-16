"use server";

import { loginSchema } from "@/lib/schemas/loginSchema";

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // 1. Validar campos con Zod
  const result = loginSchema.safeParse({ email, password });

  if (!result.success) {
    // Retorna los errores de validación formateados para el cliente
    const fieldErrors = result.error.flatten().fieldErrors;
    return {
      success: false,
      errors: {
        email: fieldErrors.email?.[0] || null,
        password: fieldErrors.password?.[0] || null,
      },
    };
  }

  // 2. Si es válido, devolvemos los datos limpios para el signIn en el cliente
  return {
    success: true,
    data: result.data,
    errors: null,
  };
}
