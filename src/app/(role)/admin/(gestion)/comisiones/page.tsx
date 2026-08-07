"use client";

import { useState, useMemo } from "react";
import { Comision } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Modal } from "@/components/ui/Modal";
import { useGetCarreras } from "@/hooks/useCarreras";
import { useGetMaterias, useGetAlumnosPorMateria, useAsignarDivisionAMateria } from "@/hooks/useMaterias";
import { useGetDivisiones } from "@/hooks/useDivisiones";
import { useGetComisiones } from "@/hooks/useComisiones";
import { AsignarDocenteModal } from "./AsignarDocenteModal";

export default function ComisionesPage() {
  const { comisiones, isLoading: loadCom, isError: errCom } = useGetComisiones();
  const { carreras, isLoading: loadCar } = useGetCarreras();
  const { materias, isLoading: loadMat } = useGetMaterias();
  const { divisiones, isLoading: loadDiv } = useGetDivisiones();
  const { mutate: createComision, isPending: isCreating } = useAsignarDivisionAMateria();

  const [activeModal, setActiveModal] = useState<"docente" | "alumnos" | null>(null);
  const [selectedComision, setSelectedComision] = useState<Comision | null>(null);

  const [selectedCarreraId, setSelectedCarreraId] = useState<string>("");
  const [selectedMateriaId, setSelectedMateriaId] = useState<string>("");
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");

  // FILTROS
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCarrera, setFilterCarrera] = useState("");
  const [filterDocente, setFilterDocente] = useState("");

  // ==========================================
  // ESTADOS Y CONSTANTES DE PAGINACIÓN
  // ==========================================
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // ==========================================
  // MODALES
  // ==========================================
  const handleOpenDocenteModal = (comision: Comision) => {
    setSelectedComision(comision);
    setActiveModal("docente");
  };

  const handleOpenAlumnosModal = (comision: Comision) => {
    setSelectedComision(comision);
    setActiveModal("alumnos");
  };

  const isLoading = loadCom || loadCar || loadMat || loadDiv;

  const listaDocentesUnicos = useMemo(() => {
    if (!comisiones) return [];
    const docentes = comisiones.map((c) => c.docenteAsignado).filter((d) => d && d !== "No asignado");
    return Array.from(new Set(docentes));
  }, [comisiones]);

  // 1. Primero filtramos
  const totalComisionesFiltradas = useMemo(() => {
    if (!comisiones) return [];

    return comisiones
      .filter((com) => {
        const matchesSearch = com.materia.toLowerCase().includes(searchQuery.toLowerCase());
        const materiaAsociada = materias?.find((m) => m.nombre === com.materia);
        const matchesCarrera = filterCarrera === "" || (materiaAsociada && String(materiaAsociada.idCarrera) === filterCarrera);
        const matchesDocente = filterDocente === "" || com.docenteAsignado === filterDocente;

        return matchesSearch && matchesCarrera && matchesDocente;
      })
      .sort((a, b) => a.materia.localeCompare(b.materia) || a.division.localeCompare(b.division));
  }, [comisiones, searchQuery, filterCarrera, filterDocente, materias]);

  // 2. Páginas totales
  const totalPages = useMemo(() => {
    return Math.ceil(totalComisionesFiltradas.length / ITEMS_PER_PAGE) || 1;
  }, [totalComisionesFiltradas]);

  // 3. Rebanamos para la vista
  const comisionesPaginadas = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return totalComisionesFiltradas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [totalComisionesFiltradas, currentPage]);

  const materiasFiltradasForm = useMemo(() => {
    if (!selectedCarreraId || !materias) return [];
    return materias.filter((m) => m.idCarrera === Number(selectedCarreraId) && m.estado === true);
  }, [materias, selectedCarreraId]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMateriaId || !selectedDivisionId) return;

    createComision(
      { idMateria: Number(selectedMateriaId), payload: { Id: Number(selectedDivisionId) } },
      {
        onSuccess: () => {
          setSelectedMateriaId("");
          setSelectedDivisionId("");
        },
      }
    );
  };

  return (
    <div className="space-y-6 antialiased">
      <div className="border-b border-slate-200/60 pb-4">
        <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">Distribución de Comisiones</h1>
        <p className="text-xs text-slate-400 mt-0.5">Asigná divisiones e instrumentá el cuerpo docente responsable.</p>
      </div>

      {/* PANEL DE FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.005)] grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input type="text" placeholder="🔍 Buscar por asignatura..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-700" />
        <select value={filterCarrera} onChange={(e) => { setFilterCarrera(e.target.value); setCurrentPage(1); }} className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-500">
          <option value="">Filtrar por Carrera (Todas)</option>
                {carreras?.filter(c => c.estado).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select value={filterDocente} onChange={(e) => { setFilterDocente(e.target.value); setCurrentPage(1); }} className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-500">
          <option value="">Filtrar por Docente (Todos)</option>
          {listaDocentesUnicos.map((doc, idx) => <option key={idx} value={doc}>{doc}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LISTADO DE COMISIONES */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Divisiones Establecidas</h2>
            <span className="text-[10px] font-mono bg-slate-100 font-bold px-2 py-0.5 text-slate-500 rounded-md">Filtradas: {totalComisionesFiltradas.length}</span>
          </div>

          {isLoading ? (
            <div className="text-sm font-medium text-slate-400 p-8 text-center bg-white border border-slate-200/60 rounded-2xl">Sincronizando comisiones...</div>
          ) : errCom ? (
            <ErrorMessage message="Error crítico al recuperar el mapa de comisiones." />
          ) : comisionesPaginadas.length === 0 ? (
            <div className="text-sm font-medium text-slate-400 p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl">Ninguna comisión coincide con los filtros.</div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-wider select-none">
                        <th className="p-4">Asignatura</th>
                        <th className="p-4">División</th>
                        <th className="p-4">Docente Responsable</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comisionesPaginadas.map((com) => (
                        <tr key={com.idMateriaDivision} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="p-4 font-bold text-slate-800 tracking-tight">{com.materia}</td>
                          <td className="p-4 font-mono font-bold text-slate-600 text-xs">{com.division}</td>
                          <td className="p-4 text-xs">
                            <span className={com.docenteAsignado === "No asignado" ? "italic text-amber-600 font-medium" : "font-semibold text-slate-700"}>{com.docenteAsignado}</span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => handleOpenAlumnosModal(com)} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors">🧑‍🎓 Alumnos</button>
                              <button type="button" onClick={() => handleOpenDocenteModal(com)} className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200">Asignar Profesor</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CONTROLES DE PAGINACIÓN */}
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-sm text-xs font-semibold text-slate-500 select-none">
                <div>
                  Mostrando página <strong className="text-slate-800">{currentPage}</strong> de <strong className="text-slate-800">{totalPages}</strong>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FORMULARIO */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nueva Comisión</h2>
          <form onSubmit={handleFormSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Filtro por Carrera</label>
              <select value={selectedCarreraId} onChange={(e) => { setSelectedCarreraId(e.target.value); setSelectedMateriaId(""); }} className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-700" required>
                <option value="">Seleccioná la carrera...</option>
          {carreras?.filter(c => c.estado).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Materia Cátedra</label>
              <select value={selectedMateriaId} onChange={(e) => setSelectedMateriaId(e.target.value)} disabled={!selectedCarreraId} className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-700 disabled:opacity-40" required>
                <option value="">Seleccioná la materia...</option>
                {materiasFiltradasForm.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">División Asignada</label>
              <select value={selectedDivisionId} onChange={(e) => setSelectedDivisionId(e.target.value)} className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-700" required>
                <option value="">Seleccioná división...</option>
                {divisiones?.map((d) => <option key={d.id} value={d.id}>{d.descripcion}</option>)}
              </select>
            </div>
            <Button type="submit" disabled={isCreating || !selectedMateriaId || !selectedDivisionId} className="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition-all shadow-sm">
              {isCreating ? "Registrando comisión..." : "Guardar Comisión"}
            </Button>
          </form>
        </div>
      </div>

      <Modal isOpen={activeModal !== null} onClose={() => { setActiveModal(null); setSelectedComision(null); }} title={activeModal === "docente" ? `Asignar Profesor` : `Nómina de Alumnos — Comisión ${selectedComision?.division || ""}`}>
        {activeModal === "docente" && selectedComision && (
          <AsignarDocenteModal comisionId={selectedComision.idMateriaDivision} docenteActualNombre={selectedComision.docenteAsignado} onSuccess={() => { setActiveModal(null); setSelectedComision(null); }} />
        )}
        {activeModal === "alumnos" && selectedComision && (
          <AlumnosComisionList materiaNombre={selectedComision.materia} divisionFiltro={selectedComision.division} />
        )}
      </Modal>
    </div>
  );
}

// 📦 REUTILIZACIÓN DE CONSULTA REAL FILTRADA EN EL CLIENTE
function AlumnosComisionList({ materiaNombre, divisionFiltro }: { materiaNombre: string; divisionFiltro: string }) {
  const { materias } = useGetMaterias();
  
  const materiaId = useMemo(() => {
    return materias?.find((m) => m.nombre === materiaNombre)?.id || null;
  }, [materias, materiaNombre]);

  const { data: alumnos, isLoading: isLoadingAlumnos, isError: isErrorAlumnos } = useGetAlumnosPorMateria(materiaId!);

  const alumnosFiltradosComision = useMemo(() => {
    if (!alumnos) return [];
    return alumnos.filter((alumno) => alumno.division.trim().toUpperCase() === divisionFiltro.trim().toUpperCase());
  }, [alumnos, divisionFiltro]);

  if (!materiaId || isLoadingAlumnos) return <p className="text-xs text-slate-400 text-center py-4">Mapeando nómina relacional...</p>;
  if (isErrorAlumnos) return <ErrorMessage message="No se pudo procesar la lista para esta división." />;

  return (
    <div className="space-y-2 divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
      {alumnosFiltradosComision.length > 0 ? (
        alumnosFiltradosComision.map((al) => (
          <div key={al.matricula} className="py-2.5 first:pt-0 flex justify-between items-center">
            <p className="font-bold text-slate-700 text-sm">{al.nombreAlumno}</p>
            <span className="text-[11px] font-mono font-bold bg-indigo-50 border border-indigo-100/30 text-indigo-700 px-2 py-0.5 rounded-md">Leg: {al.matricula}</span>
          </div>
        ))
      ) : (
        <p className="text-xs text-slate-400 italic py-4 text-center">No se registran alumnos matriculados específicamente en la división &quot;{divisionFiltro}&quot;.</p>
      )}
    </div>
  );
}
