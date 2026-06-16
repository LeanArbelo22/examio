"use client";

import { useState, useMemo, useEffect } from "react";
import { Materia, CreateMateriaPayload, UpdateMateriaPayload } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Modal } from "@/components/ui/Modal";
import { useGetCarreras } from "@/hooks/useCarreras";
import { useGetMaterias, useCreateMateria, useUpdateMateria, useDeleteMateria } from "@/hooks/useMaterias";
import { DetalleMateriaModal } from "./DetalleMateriaModal";

export default function MateriasPage() {
  const { materias, isLoading: isLoadingMaterias, isError: isErrorMaterias } = useGetMaterias();
  const { carreras, isLoading: isLoadingCarreras, isError: isErrorCarreras } = useGetCarreras();
  const { createMateria, isCreating } = useCreateMateria();
  const { mutate: updateMateria, isPending: isUpdating } = useUpdateMateria();
  const { mutate: eliminarMateria } = useDeleteMateria();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMateria, setSelectedMateria] = useState<Materia | null>(null);
  const [materiaEnEdicion, setMateriaEnEdicion] = useState<Materia | null>(null);

  const [formData, setFormData] = useState({ Nombre: "", Semestre: "", IdCarrera: "" });

  // FILTROS
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCarrera, setFilterCarrera] = useState("");
  const [filterSemestre, setFilterSemestre] = useState("");

  // ==========================================
  // ESTADOS Y CONSTANTES DE PAGINACIÓN
  // ==========================================
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  // Resetear a la página 1 cada vez que el usuario escribe un filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCarrera, filterSemestre]);

  const isLoading = isLoadingMaterias || isLoadingCarreras;
  const isError = isErrorMaterias || isErrorCarreras;

  const carrerasMap = useMemo(() => {
    if (!carreras) return {};
    return carreras.reduce((map, carrera) => {
      map[carrera.id] = carrera.nombre;
      return map;
    }, {} as Record<number, string>);
  }, [carreras]);

  // 1. Primero filtramos y ordenamos la totalidad de los datos
  const totalMateriasFiltradas = useMemo(() => {
    if (isLoading || !materias || !carreras) return [];

    const activas = materias.filter((m) => m.estado === true);

    const filtradas = activas.filter((materia) => {
      const matchesSearch = materia.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCarrera = filterCarrera === "" || String(materia.idCarrera) === filterCarrera;
      const matchesSemestre = filterSemestre === "" || String(materia.semestre) === filterSemestre;

      return matchesSearch && matchesCarrera && matchesSemestre;
    });

    return filtradas.map((m) => ({
      ...m,
      nombreCarrera: carrerasMap[m.idCarrera] || "Plan Desconocido",
    })).sort((a, b) => (a.idCarrera - b.idCarrera) || (a.semestre - b.semestre));
  }, [materias, carreras, carrerasMap, isLoading, searchQuery, filterCarrera, filterSemestre]);

  // 2. Calculamos el total de páginas basado en el resultado filtrado
  const totalPages = useMemo(() => {
    return Math.ceil(totalMateriasFiltradas.length / ITEMS_PER_PAGE) || 1;
  }, [totalMateriasFiltradas]);

  // 3. Rebanamos el array para mostrar SOLO los 30 de la página actual
  const materiasPaginadas = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return totalMateriasFiltradas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [totalMateriasFiltradas, currentPage]);

  const opcionesCarreras = useMemo(() => {
    if (!carreras) return [];
    return carreras.filter((c) => c.estado);
  }, [carreras]);

  useEffect(() => {
    if (materiaEnEdicion) {
      setFormData({ Nombre: materiaEnEdicion.nombre, Semestre: String(materiaEnEdicion.semestre), IdCarrera: String(materiaEnEdicion.idCarrera) });
    } else {
      setFormData({ Nombre: "", Semestre: "", IdCarrera: "" });
    }
  }, [materiaEnEdicion]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (materiaEnEdicion) {
      const data: UpdateMateriaPayload = { Nombre: formData.Nombre, Semestre: Number(formData.Semestre) };
      updateMateria(
        { id: materiaEnEdicion.id, data },
        { onSuccess: () => setMateriaEnEdicion(null) },
      );
    } else {
      const payload: CreateMateriaPayload = { Nombre: formData.Nombre, Semestre: Number(formData.Semestre), IdCarrera: Number(formData.IdCarrera) };
      createMateria(payload, { onSuccess: () => setFormData({ Nombre: "", Semestre: "", IdCarrera: "" }) });
    }
  };

  return (
    <div className="space-y-6 antialiased">
      <div className="border-b border-slate-200/60 pb-4">
        <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">Asignaturas Académicas (ABM Materias)</h1>
        <p className="text-xs text-slate-400 mt-0.5">Gestioná el mapa de cátedras institucionales y asignación semestral.</p>
      </div>

      {/* PANEL DE FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.005)] grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="🔍 Buscar materia..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-700"
        />
        <select
          value={filterCarrera}
          onChange={(e) => setFilterCarrera(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-500"
        >
          <option value="">Filtrar por Carrera (Todas)</option>
          {opcionesCarreras.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select
          value={filterSemestre}
          onChange={(e) => setFilterSemestre(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-500"
        >
          <option value="">Filtrar por Semestre (Todos)</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <option key={s} value={s}>Semestre {s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* TABLA PRINCIPAL */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Planificación Activa</h2>
            <span className="text-[10px] font-mono bg-slate-100 font-bold px-2 py-0.5 text-slate-500 rounded-md">Total filtradas: {totalMateriasFiltradas.length}</span>
          </div>

          {isLoading ? (
            <div className="text-sm font-medium text-slate-400 p-8 text-center bg-white border border-slate-200/60 rounded-2xl">Sincronizando asignaturas...</div>
          ) : isError ? (
            <ErrorMessage message="Error crítico al mapear las asignaturas." />
          ) : materiasPaginadas.length === 0 ? (
            <div className="text-sm font-medium text-slate-400 p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl">Ninguna materia coincide con la búsqueda.</div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-wider select-none">
                        <th className="p-4">Materia / Cátedra</th>
                        <th className="p-4">Carrera Asociada</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {materiasPaginadas.map((materia) => (
                        <tr key={materia.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="p-4">
                            <p className="font-bold text-slate-800 tracking-tight">{materia.nombre}</p>
                            <p className="text-[11px] font-mono font-bold text-indigo-500 mt-0.5">Semestre {materia.semestre}</p>
                          </td>
                          <td className="p-4 text-xs font-semibold text-slate-500 max-w-[200px] truncate">{materia.nombreCarrera}</td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => { setSelectedMateria(materia); setIsModalOpen(true); }} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors">🗓️ Comisiones y Alumnos</button>
                              <button type="button" onClick={() => setMateriaEnEdicion(materia)} className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200">Editar</button>
                              <button type="button" onClick={() => { if (window.confirm(`¿Inhabilitar?`)) eliminarMateria(materia.id); }} className="text-xs font-bold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">Inhabilitar</button>
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
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold transition-colors disabled:opacity-40 disabled:hover:bg-slate-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold transition-colors disabled:opacity-40 disabled:hover:bg-slate-50 disabled:cursor-not-allowed"
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
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{materiaEnEdicion ? "Editor" : "Nuevo"}</h2>
          <form onSubmit={handleFormSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nombre de la Materia</label>
              <input type="text" value={formData.Nombre} onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })} placeholder="Ej: Matemáticas II" className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-800" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Número de Semestre</label>
              <input type="number" min="1" value={formData.Semestre} onChange={(e) => setFormData({ ...formData, Semestre: e.target.value })} placeholder="Ej: 2" className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-mono font-bold text-slate-800" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Carrera Universitaria</label>
              <select value={formData.IdCarrera} onChange={(e) => setFormData({ ...formData, IdCarrera: e.target.value })} disabled={!!materiaEnEdicion} className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-600 disabled:opacity-50" required>
                <option value="" disabled>Seleccioná la carrera...</option>
                {opcionesCarreras.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={isCreating || isUpdating} className="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition-all shadow-sm">
              {isCreating || isUpdating ? "Escribiendo en SQL..." : "Guardar Asignatura"}
            </Button>
          </form>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedMateria(null); }} title={`Detalle Operativo — ${selectedMateria?.nombre || "..."}`}>
        {selectedMateria && <DetalleMateriaModal materiaId={selectedMateria.id} />}
      </Modal>
    </div>
  );
}