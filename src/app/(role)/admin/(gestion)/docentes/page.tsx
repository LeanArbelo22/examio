"use client";

import { useState, useMemo } from "react";
import { Docente, CreateDocentePayload, UpdateDocentePayload } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Modal } from "@/components/ui/Modal";
import {
  useCreateDocente,
  useDeleteDocente,
  useGetDocentes,
  useUpdateDocente,
} from "@/hooks/useDocentes";
import { DetalleDocenteModal } from "./DetalleDocenteModal";

export default function DocentesPage() {
  const { docentes, isLoading, isError } = useGetDocentes();
  const { mutate: crearDocente, isPending: isCreating } = useCreateDocente();
  const { mutate: modificarDocente, isPending: isUpdating } = useUpdateDocente();
  const { mutate: inhabilitarDocente } = useDeleteDocente();

  const [selectedDocente, setSelectedDocente] = useState<Docente | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docenteEnEdicion, setDocenteEnEdicion] = useState<Docente | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState("activos");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  const [formData, setFormData] = useState({
    Nombre: "", Apellido: "", Correo: "", Cuil: "", Legajo: ""
  });

  const isProcessing = isCreating || isUpdating;

  const handleEditClick = (docente: Docente) => {
    setDocenteEnEdicion(docente);
    setFormData({
      Nombre: docente.nombre || "",
      Apellido: docente.apellido || "",
      Correo: docente.correo || "",
      Cuil: docente.cuil || "",
      Legajo: String(docente.legajo || ""),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setDocenteEnEdicion(null);
    setFormData({ Nombre: "", Apellido: "", Correo: "", Cuil: "", Legajo: "" });
  };

  const docentesFiltrados = useMemo(() => {
    if (!docentes) return [];
    return docentes.filter((doc) => {
      const fullText = `${doc.nombre || ""} ${doc.apellido || ""} ${doc.legajo || ""}`.toLowerCase();
      const matchesSearch = fullText.includes(searchQuery.toLowerCase());
      const isActivo = doc.estado === true || Number(doc.estado) === 1;
      if (filterEstado === "activos") return matchesSearch && isActivo;
      if (filterEstado === "inactivos") return matchesSearch && !isActivo;
      return matchesSearch;
    });
  }, [docentes, searchQuery, filterEstado]);

  const totalPages = Math.ceil(docentesFiltrados.length / ITEMS_PER_PAGE) || 1;
  const docentesPaginados = docentesFiltrados.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (docenteEnEdicion) {
      const data: UpdateDocentePayload = {
        Nombre: formData.Nombre,
        Apellido: formData.Apellido,
        Correo: formData.Correo,
      };
      modificarDocente(
        { legajo: docenteEnEdicion.legajo, data },
        { onSuccess: handleCancelEdit }
      );
    } else {
      const payload: CreateDocentePayload = {
        Legajo: Number(formData.Legajo),
        Nombre: formData.Nombre,
        Apellido: formData.Apellido,
        Cuil: formData.Cuil,
        Correo: formData.Correo,
      };
      crearDocente(payload, { onSuccess: () => setFormData({ Nombre: "", Apellido: "", Correo: "", Cuil: "", Legajo: "" }) });
    }
  };

  const handleDeleteClick = (docente: Docente) => {
    if (window.confirm(`¿Estás seguro de inhabilitar al docente "${docente.nombre} ${docente.apellido}"? (Baja lógica Estado=0 en SQL)`)) {
      inhabilitarDocente(docente.legajo);
    }
  };

  return (
    <div className="space-y-6 antialiased">
      <div className="border-b border-slate-200/60 pb-4">
        <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">Cuerpo Docente (ABM Profesores)</h1>
        <p className="text-xs text-slate-400 mt-0.5">Alta de legajos de personal, control de CUIL y asignación de cátedras institucionales.</p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input 
          type="text" placeholder="🔍 Buscar por nombre, apellido o legajo..." 
          value={searchQuery} onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 font-medium text-slate-700"
        />
        <select value={filterEstado} onChange={(e) => {
          setFilterEstado(e.target.value);
          setCurrentPage(1);
        }} className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none font-medium text-slate-500">
          <option value="activos">Estado: Activos</option>
          <option value="inactivos">Estado: Inactivos (Baja Lógica)</option>
          <option value="todos">Mostrar Todos</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cuerpo de Profesores</h2>
            <span className="text-[10px] font-mono bg-slate-100 font-bold px-2 py-0.5 text-slate-500 rounded-md">Legajos: {docentesFiltrados.length}</span>
          </div>

          {isError ? (
            <ErrorMessage message="Error al enlazar con el servicio de base de datos de profesores." />
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-wider select-none">
                      <th className="p-4">Docente Titular</th>
                      <th className="p-4">CUIL / Correo</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {isLoading ? (
                      <tr><td colSpan={3} className="p-8 text-center text-slate-400">Consultando tablas en puerto 55803...</td></tr>
                    ) : docentesPaginados.length === 0 ? (
                      <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">No se registran profesores con esos criterios de búsqueda.</td></tr>
                    ) : docentesPaginados.map(doc => {
                      const isActivo = doc.estado === true || Number(doc.estado) === 1;
                      return (
                        <tr key={doc.legajo} className={`hover:bg-slate-50/50 transition-colors ${!isActivo ? 'opacity-50 bg-slate-50/40' : ''}`}>
                          <td className="p-4">
                            <p className="font-bold text-slate-800 tracking-tight">{doc.nombre} {doc.apellido}</p>
                            <p className="text-[11px] font-mono text-indigo-600 font-bold mt-0.5">Legajo: {doc.legajo}</p>
                          </td>
                          <td className="p-4 max-w-[180px]">
                            <p className="text-xs font-semibold text-slate-600 truncate">{doc.correo}</p>
                            <p className="text-[10px] font-mono font-medium text-slate-400 mt-0.5">CUIL: {doc.cuil || "No registrado"}</p>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button type="button" onClick={() => { setSelectedDocente(doc); setIsModalOpen(true); }} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">📚 Cátedras</button>
                              <button type="button" onClick={() => handleEditClick(doc)} className="text-xs font-bold text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">Editar</button>
                              {isActivo && (
                                <button type="button" onClick={() => handleDeleteClick(doc)} className="text-xs font-bold text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Baja</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-500">
                <span>Página {currentPage} de {totalPages}</span>
                <div className="flex gap-2">
                  <Button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 bg-slate-50 text-slate-600 border-slate-200">Anterior</Button>
                  <Button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 bg-slate-50 text-slate-600 border-slate-200">Siguiente</Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{docenteEnEdicion ? "Modificar Datos" : "Registrar Docente"}</h2>
          <form onSubmit={handleFormSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nombre</label>
                <input placeholder="Ej: Augusto" value={formData.Nombre} onChange={e => setFormData({...formData, Nombre: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-medium text-slate-800" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Apellido</label>
                <input placeholder="Ej: JH" value={formData.Apellido} onChange={e => setFormData({...formData, Apellido: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-medium text-slate-800" required />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Correo Electrónico</label>
              <input type="email" placeholder="profesor@cervantes.edu.ar" value={formData.Correo} onChange={e => setFormData({...formData, Correo: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-medium text-slate-800" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">CUIL (Inmutable)</label>
              <input type="text" placeholder="Ej: 20-25619382-9" value={formData.Cuil} onChange={e => setFormData({...formData, Cuil: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-mono font-medium text-slate-800 disabled:opacity-40" required disabled={!!docenteEnEdicion} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Número de Legajo</label>
              <input type="number" placeholder="Ej: 832" value={formData.Legajo} onChange={e => setFormData({...formData, Legajo: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-mono font-bold text-slate-800 disabled:opacity-40" required disabled={!!docenteEnEdicion} />
            </div>
            
            <Button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2.5 shadow-sm" disabled={isProcessing}>
              {isProcessing ? "Escribiendo en SQL..." : (docenteEnEdicion ? "Guardar Cambios" : "Confirmar Alta")}
            </Button>
            {docenteEnEdicion && (
              <button type="button" onClick={handleCancelEdit} className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 mt-1.5 transition-colors">Volver a nuevo registro</button>
            )}
          </form>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedDocente(null); }}
        title={`Cátedras Asignadas — Legajo: ${selectedDocente?.legajo || ""}`}
      >
        {selectedDocente && <DetalleDocenteModal legajo={selectedDocente.legajo} />}
      </Modal>
    </div>
  );
}
