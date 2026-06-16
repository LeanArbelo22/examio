"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useGetHistorialCorregido } from "@/hooks/useEvaluaciones";
import type { HistorialCorregidoItem } from "@/types/index";

export default function ResultadosPage() {
  const { data: session } = useSession();

  const identificador = Number(session?.user?.identificadorInstitucional ?? 0);
  const { data: historial = [], isLoading } = useGetHistorialCorregido(identificador);

  const historialSeguro = historial ?? [];
  const aprobadas = historialSeguro.filter((r: HistorialCorregidoItem) => (r.notaFinal ?? 0) >= 6).length;
  const desaprobadas = historialSeguro.filter((r: HistorialCorregidoItem) => (r.notaFinal ?? 0) < 6).length;

  return (
    <div className="max-w-4xl mx-auto antialiased space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/alumno" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
            &larr; Volver al Dashboard
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Historial completo de resultados</h1>
        </div>
      </div>

      <div className="flex gap-4 text-sm font-semibold">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
          <span className="text-emerald-700">{aprobadas} aprobadas</span>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2">
          <span className="text-red-600">{desaprobadas} desaprobadas</span>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm font-medium text-slate-400 italic">Cargando historial...</p>
      )}

      {!isLoading && historial.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400">
          Aún no tenés exámenes corregidos.
        </div>
      )}

      <div className="space-y-2">
        {historialSeguro.map((result: HistorialCorregidoItem) => {
          const nota = result.notaFinal != null ? result.notaFinal : 0;
          return (
            <div
              key={result.idIntento}
              className="flex items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-700 truncate">{result.tituloEvaluacion}</p>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500 shrink-0">
                    #{result.numeroIntento}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{result.materia} &middot; {result.division}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-3 py-1 text-sm font-black rounded-lg ${nota >= 6 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                  {nota.toFixed(1)}
                </span>
                <Link
                  href={`/alumno/intento/${result.idIntento}`}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Ver detalle &rarr;
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
