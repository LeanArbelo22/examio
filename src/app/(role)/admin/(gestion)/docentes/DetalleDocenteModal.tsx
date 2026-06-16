"use client";

import { useGetMateriasPorDocente } from "@/hooks/useDocentes";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

export const DetalleDocenteModal = ({ legajo }: { legajo: number }) => {
  const { data: asignaciones, isLoading, isError } = useGetMateriasPorDocente(legajo);

  return (
    <div className="space-y-4 antialiased text-sm font-medium">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mallas Curriculares Dictadas</h3>
      
      {isLoading ? (
        <p className="text-xs text-slate-400 text-center py-4">Ejecutando SP_Docente_VerMaterias...</p>
      ) : isError ? (
        <ErrorMessage message="Error al recuperar las actas de asignación de comisiones." />
      ) : !asignaciones || asignaciones.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          El docente no registra comisiones ni asignaturas a cargo actualmente.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
          {asignaciones.map((ins: any) => (
            <div key={ins.idComision} className="p-4 bg-white flex justify-between items-center group hover:bg-slate-50/40 transition-colors">
              <div>
                {/* Mapeo de alias exactos de SP_Docente_VerMaterias: ins.nombreMateria e ins.carrera */}
                <p className="font-bold text-slate-800 tracking-tight text-sm">
                  {ins.nombreMateria}
                </p>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5 tracking-wide">
                  {ins.carrera} — <span className="font-mono text-indigo-500 font-bold uppercase">División {ins.division}</span>
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md select-none">
                ID: {ins.idComision}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};