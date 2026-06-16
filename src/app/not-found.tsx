import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-transparent flex flex-col items-center justify-center p-6 text-center selection:bg-indigo-100 antialiased">
      <div className="max-w-md w-full flex flex-col items-center">
        
        {/* Indicador Visual Premium */}
        <div className="relative flex items-center justify-center mb-6">
          <span className="text-8xl font-black tracking-tighter text-indigo-600/10 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Textos Informativos */}
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight sm:text-3xl">
          Página no encontrada
        </h2>
        
        <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-sm">
          La ruta a la que intentás acceder no existe, cambió de lugar o no tenés los permisos institucionales necesarios.
        </p>

        {/* Botón de escape de UX */}
        <div className="mt-8 w-full sm:w-auto">
          <Link href="/" className="inline-block w-full">
            <Button className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm active:scale-[0.99] transition-all duration-200">
              Volver al inicio
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
}