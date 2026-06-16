"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Button } from "../ui/Button";
import { clearApiToken } from "@/lib/api";

export function SessionExpiredModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    // Escucha el evento global de sesión expirada
    const handleSessionExpired = () => setIsOpen(true);
    window.addEventListener("EXAMIO_SESSION_EXPIRED", handleSessionExpired);
    
    return () => {
      window.removeEventListener("EXAMIO_SESSION_EXPIRED", handleSessionExpired);
    };
  }, []);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      // Forzamos un llamado a la API interna de NextAuth para refrescar la cookie de sesión
      await fetch("/api/auth/session");
      setIsOpen(false);
    } catch (error) {
      // Si falla estrepitosamente, lo mandamos al login por seguridad
      handleLogout();
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = () => {
    clearApiToken();
    setIsOpen(false);
    signOut({ callbackUrl: "/login" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 transition-all">
      {/* Backdrop de desenfoque oscuro controlado */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleLogout} />
      
      {/* Tarjeta del Modal */}
      <div className="relative bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] max-w-md w-full mx-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          
          {/* Icono de Alerta en Ámbar (Menos agresivo, indica advertencia de tiempo) */}
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-amber-50 border border-amber-100 mb-4 text-amber-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tu sesión está por expirar</h2>
          
          <p className="mt-2 text-sm text-slate-500 leading-relaxed mb-6">
            Por razones de seguridad institucional, tu tiempo activo ha finalizado. Extendé la sesión ahora para proteger tus respuestas y continuar con tu evaluación.
          </p>

          {/* Acciones de Botones Reordenadas bajo estándares UX */}
          <div className="flex gap-3 w-full">
            <Button
              onClick={handleLogout}
              className="w-full bg-slate-100 border border-slate-200/40 text-slate-700 py-2.5 px-4 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-all duration-200"
            >
              Salir
            </Button>
            
            <Button
              onClick={handleExtendSession}
              disabled={isExtending}
              className="w-full bg-indigo-600 text-white py-2.5 px-4 text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100 transition-all duration-200"
            >
              {isExtending ? "Extendiendo..." : "Extender sesión"}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}