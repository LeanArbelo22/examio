"use client";

import { useState } from "react";
import { useGetComisionesPorMateria, useGetAlumnosPorMateria } from "@/hooks/useMaterias";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

interface DetalleMateriaModalProps {
  materiaId: number;
}

export const DetalleMateriaModal = ({ materiaId }: DetalleMateriaModalProps) => {
  const [activeTab, setActiveTab] = useState<"comisiones" | "alumnos">("comisiones");

  const { data: comisiones, isLoading: isLoadingComisiones, isError: isErrorComisiones } = useGetComisionesPorMateria(materiaId);
  const { data: alumnos, isLoading: isLoadingAlumnos, isError: isErrorAlumnos } = useGetAlumnosPorMateria(materiaId);

  return (
    <div className="space-y-4 antialiased">
      {/* Pestañas de control internas */}
      <div className="border-b border-slate-100">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab("comisiones")}
            className={`pb-3 px-1 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors duration-150 ${
              activeTab === "comisiones" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Comisiones Activas
          </button>
          <button
            onClick={() => setActiveTab("alumnos")}
            className={`pb-3 px-1 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors duration-150 ${
              activeTab === "alumnos" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Alumnos Inscriptos
          </button>
        </nav>
      </div>

      {/* Cuerpos de Datos */}
      <div className="pt-1">
        {activeTab === "comisiones" && (
          isLoadingComisiones ? (
            <p className="text-xs font-semibold text-slate-400 text-center py-4">Buscando divisiones asignadas...</p>
          ) : isErrorComisiones ? (
            <ErrorMessage message="Error al sincronizar las comisiones vigentes." />
          ) : (
            <div className="space-y-2 divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
              {comisiones && comisiones.length > 0 ? (
                comisiones.map((comision: any) => (
                  <div key={comision.idComision} className="py-2.5 first:pt-0 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-700 text-sm">División: {comision.division}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Profesor: {" "}
                        <span className={comision.docenteAsignado === 'No asignado' ? 'italic font-medium text-amber-600' : 'font-semibold text-slate-600'}>
                          {comision.docenteAsignado}
                        </span>
                      </p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200/40 px-2 py-0.5 rounded-md select-none">
                      ID: {comision.idComision}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">No hay comisiones estructuradas para esta materia.</p>
              )}
            </div>
          )
        )}

        {activeTab === "alumnos" && (
          isLoadingAlumnos ? (
            <p className="text-xs font-semibold text-slate-400 text-center py-4">Sincronizando matrícula de alumnos...</p>
          ) : isErrorAlumnos ? (
            <ErrorMessage message="Error al recuperar nómina de inscriptos." />
          ) : (
            <div className="space-y-2 divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
              {alumnos && alumnos.length > 0 ? (
                alumnos.map((alumno: any) => (
                  <div key={alumno.matricula} className="py-2.5 first:pt-0 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-700 text-sm">{alumno.nombreAlumno}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">División de cursado: <span className="font-semibold text-slate-600">{alumno.division}</span></p>
                    </div>
                    <span className="text-[11px] font-mono font-bold bg-indigo-50 border border-indigo-100/30 text-indigo-700 px-2 py-0.5 rounded-md">
                      Leg: {alumno.matricula}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">La cátedra no registra alumnos asignados para este ciclo.</p>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};