"use client";

import { useState, useMemo } from "react";
import { useGetDocentes, useAssignDocente } from "@/hooks/useDocentes";

interface AsignarDocenteModalProps {
  comisionId: number;
  docenteActualNombre: string;
  onSuccess: () => void;
}

export const AsignarDocenteModal = ({ comisionId, docenteActualNombre, onSuccess }: AsignarDocenteModalProps) => {
  const [selectedDocenteLegajo, setSelectedDocenteLegajo] = useState<string>("");

  const { docentes, isLoading, isError } = useGetDocentes();
  const { mutate: assignDocente, isPending: isAssigning } = useAssignDocente();

  const opcionesDocentes = useMemo(() => {
    if (!docentes) return [];
    return docentes
      .filter((d) => d.estado === true)
      .map((d) => ({ value: d.legajo.toString(), label: `${d.nombre} ${d.apellido}` }));
  }, [docentes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocenteLegajo) return;

    // Si el usuario selecciona desasignar, pasamos un null controlado al backend
    const legajoPayload = selectedDocenteLegajo === "NULL" ? null : Number(selectedDocenteLegajo);

    assignDocente(
      { Legajo: legajoPayload, IdMateriaDivision: comisionId },
      { onSuccess: () => onSuccess() }
    );
  };

  if (isLoading) return <p className="text-xs font-semibold text-slate-400 text-center py-4">Buscando legajos docentes activos...</p>;
  if (isError) return <p className="text-xs font-bold text-red-600 text-center py-4">Error al comunicar con el servicio de personal.</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm font-medium">
      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex items-center justify-between text-xs text-slate-600">
        <span>Cátedra a cargo actual:</span>
        <strong className="text-slate-800">{docenteActualNombre}</strong>
      </div>

      <div>
        <label htmlFor="docenteSelect" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Seleccionar Nuevo Docente
        </label>
        <select
          id="docenteSelect"
          value={selectedDocenteLegajo}
          onChange={(e) => setSelectedDocenteLegajo(e.target.value)}
          className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-600"
          required
        >
          <option value="">-- Seleccioná un docente titular --</option>
          <option value="NULL">🚫 Desasignar Titular Actual (Vacante)</option>
          {opcionesDocentes.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isAssigning || !selectedDocenteLegajo}
          className="bg-indigo-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl hover:bg-indigo-700 active:scale-[0.99] transition-all shadow-sm disabled:opacity-40"
        >
          {isAssigning ? "Confirmando en API..." : "Asignar Docente"}
        </button>
      </div>
    </form>
  );
};