"use client";

import { useState, useMemo } from "react";
import { useGetMateriasAlumno } from "@/hooks/useAlumnos";
import { useGetCarreras } from "@/hooks/useCarreras";
import { useGetMaterias } from "@/hooks/useMaterias";
import { useGetComisiones } from "@/hooks/useComisiones";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Button } from "@/components/ui/Button";

export const DetalleAlumnoModal = ({ matricula }: { matricula: number }) => {
  const { data: inscripciones, isLoading: loadIns, isError: errIns } = useGetMateriasAlumno(matricula);
  
  // COPRÓSITOS DE FILTRADO EN CASCADA
  const { carreras } = useGetCarreras();
  const { materias } = useGetMaterias();
  const { comisiones } = useGetComisiones();

  // ESTADOS DEL SELECT EXTENDIDO
  const [formCarrera, setFormCarrera] = useState("");
  const [formMateria, setFormMateria] = useState("");
  const [formComision, setFormComision] = useState("");

  // 1. Filtrar materias de la carrera elegida
  const materiasFiltradas = useMemo(() => {
    if (!formCarrera || !materias) return [];
    return materias.filter(m => m.idCarrera === Number(formCarrera) && m.estado === true);
  }, [materias, formCarrera]);

  // 2. Filtrar las comisiones de la materia elegida
  const comisionesFiltradas = useMemo(() => {
    if (!formMateria || !comisiones) return [];
    const materiaObj = materias?.find(m => String(m.id) === formMateria);
    if (!materiaObj) return [];
    return comisiones.filter(c => c.materia === materiaObj.nombre);
  }, [comisiones, formMateria, materias]);

  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  const handleInscribir = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formComision) return;
    setEnrollmentError(
      "La API todavía no ofrece el contrato necesario para inscribir alumnos en una comisión.",
    );
  };

  return (
    <div className="space-y-5 antialiased text-sm font-medium">
      
      {/* SECCIÓN: Inscripción Guiada Inteligente (UX Comercial) */}
      <form onSubmit={handleInscribir} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Matriculación en Cátedra</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Select 1: Carrera */}
          <select 
            value={formCarrera} onChange={(e) => { setFormCarrera(e.target.value); setFormMateria(""); setFormComision(""); }}
            className="px-2.5 py-2 text-xs rounded-xl bg-white border border-slate-200 outline-none text-slate-600" required
          >
            <option value="">1. Elegir Carrera...</option>
            {carreras?.filter(c => c.estado).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          {/* Select 2: Materia (Habilitado por Carrera) */}
          <select 
            value={formMateria} onChange={(e) => { setFormMateria(e.target.value); setFormComision(""); }}
            disabled={!formCarrera}
            className="px-2.5 py-2 text-xs rounded-xl bg-white border border-slate-200 outline-none text-slate-600 disabled:opacity-40" required
          >
            <option value="">2. Elegir Asignatura...</option>
            {materiasFiltradas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>

          {/* Select 3: Comisión / División (Habilitado por Materia) */}
          <select 
            value={formComision} onChange={(e) => setFormComision(e.target.value)}
            disabled={!formMateria}
            className="px-2.5 py-2 text-xs rounded-xl bg-white border border-slate-200 outline-none text-slate-600 disabled:opacity-40" required
          >
            <option value="">3. Elegir Comisión...</option>
            {comisionesFiltradas.map(c => (
              <option key={c.idMateriaDivision} value={c.idMateriaDivision}>División: {c.division} {c.docenteAsignado !== 'No asignado' ? `(${c.docenteAsignado})` : ''}</option>
            ))}
          </select>
        </div>

        {enrollmentError && <ErrorMessage message={enrollmentError} />}

        <Button type="submit" disabled={!formComision} className="w-full bg-slate-900 text-white text-xs font-bold py-2 rounded-xl">
          Confirmar Inscripción de Alumno
        </Button>
      </form>

      {/* SECCIÓN: Listado de Cursado Activo */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Historial de Cursadas Activas</h3>
        
        {loadIns ? (
          <p className="text-xs text-slate-400 text-center py-4">Ejecutando SP_Alumno_VerMaterias...</p>
        ) : errIns ? (
          <ErrorMessage message="No se pudieron recuperar las actas de cursado del legajo." />
        ) : !inscripciones || inscripciones.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">El legajo no registra asignaturas cursando actualmente.</p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
            {inscripciones.map((ins) => (
              <div key={`${ins.matricula}-${ins.materia}-${ins.division}`} className="p-4 bg-white flex justify-between items-center group hover:bg-slate-50/40 transition-colors">
                <div>
                  {/* Mapeo de alias exactos de SP_Alumno_VerMaterias: ins.Materia e ins.Division */}
                  <p className="font-bold text-slate-800 tracking-tight text-sm">
                    {ins.materia || "Asignatura sin Nombre"}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
                    División Asignada: {ins.division || "Única"}
                  </p>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 bg-indigo-50 border border-indigo-100/30 text-indigo-700 rounded-lg select-none">
                  Cursando
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
