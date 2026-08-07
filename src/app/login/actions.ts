"use server";

import { loginSchema } from "@/lib/schemas/loginSchema";

export interface LoginActionState {
  success: boolean;
  data?: {
    email: string;
    password: string;
  };
  errors: {
    email: string | null;
    password: string | null;
  } | null;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
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
    data: {
      email: result.data.email!,
      password: result.data.password,
    },
    errors: null,
  };
}
