"use client";

import { useActionState, useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../ui/Button";
import { loginAction } from "@/app/login/actions";
import { setApiToken } from "@/lib/api";
import teamsLogo from "@/assets/images/teams-logo.svg";
import moodleLogo from "@/assets/images/moodle-logo.svg";

export function LoginForm() {
  const router = useRouter();
  const [globalError, setGlobalError] = useState<string | null>(null);

  // useActionState de React 19 maneja la acción, el estado del return y el pending nativo
  const [state, formAction, isPending] = useActionState(loginAction, {
    success: false,
    errors: null,
  });

  // Efecto que reacciona cuando la acción de validación en servidor fue exitosa
  useEffect(() => {
    if (state.success && state.data) {
      const executeSignIn = async () => {
        try {
          const result = await signIn("credentials", {
            email: state.data.email,
            password: state.data.password,
            redirect: false,
          });

          if (result?.error) {
            setGlobalError(
              result.error === "CredentialsSignin"
                ? "El correo o la contraseña son incorrectos."
                : result.error
            );
          } else {
            // Persistir el JWT de api_node para los后续 llamados HTTP
            const session = await getSession();
            const apiToken = session?.user?.accessToken;
            if (apiToken) {
              setApiToken(apiToken);
            }
            // El middleware se encargará de rutear según el rol obtenido de useSession
            router.push("/");
          }
        } catch (err: any) {
          setGlobalError(err.message || "Ocurrió un error inesperado.");
        }
      };
      executeSignIn();
    }
  }, [state, router]);

  return (
    <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Iniciar sesión</h2>
        <p className="mt-2 text-sm text-slate-500">Ingresá tus credenciales para acceder a EXAMIO</p>
      </div>

      {(globalError || state.errors?.email || state.errors?.password) && (
        <div className="text-red-600 text-sm font-medium mb-4">
          {globalError || "Por favor, corregí los errores en el formulario."}
        </div>
      )}

      {/* React 19 Form Action nativo */}
      <form action={formAction} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={`block w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border transition-all duration-200 focus:outline-none focus:bg-white focus:ring-2 ${
              state.errors?.email
                ? "border-red-300 focus:ring-red-100 focus:border-red-500"
                : "border-slate-200 focus:ring-indigo-100 focus:border-indigo-600"
            }`}
            placeholder="ejemplo@institucion.edu.ar"
          />
          {state.errors?.email && (
            <p className="mt-1.5 text-xs font-medium text-red-600">{state.errors.email}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contraseña
            </label>
            <Link href="#" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
              ¿La olvidaste?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={`block w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border transition-all duration-200 focus:outline-none focus:bg-white focus:ring-2 ${
              state.errors?.password
                ? "border-red-300 focus:ring-red-100 focus:border-red-500"
                : "border-slate-200 focus:ring-indigo-100 focus:border-indigo-600"
            }`}
            placeholder="••••••••"
          />
          {state.errors?.password && (
            <p className="mt-1.5 text-xs font-medium text-red-600">{state.errors.password}</p>
          )}
        </div>

        <div className="flex items-center pt-1">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 focus:ring-offset-0 cursor-pointer"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 select-none cursor-pointer">
            Recordar mi sesión
          </label>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full flex justify-center py-3 px-4 bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-[0.99] transition-all rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Iniciando sesión..." : "Ingresar"}
          </Button>
        </div>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200/80" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider font-semibold">
          <span className="bg-white px-3 text-slate-400">O ingresar con</span>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          type="button"
          className="flex items-center justify-center w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 shadow-sm group"
        >
          <Image src={teamsLogo} width={22} height={22} alt="Logo Teams" className="group-hover:opacity-90 transition-opacity" />
          <span className="ml-2.5 text-xs font-semibold text-slate-600">Teams</span>
        </button>
        <button
          type="button"
          className="flex items-center justify-center w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 shadow-sm group"
        >
          <Image src={moodleLogo} width={22} height={22} alt="Logo Moodle" className="group-hover:opacity-90 transition-opacity" />
          <span className="ml-2.5 text-xs font-semibold text-slate-600">Moodle</span>
        </button>
      </div>
    </div>
  );
}
