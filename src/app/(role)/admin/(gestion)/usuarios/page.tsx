"use client";

import { useState, useMemo } from "react";
import { Usuario, CreateUsuarioPayload, UpdateUsuarioPayload } from "@/types/index";
import type { UserRole } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  useGetUsuarios,
  useCreateUsuario,
  useUpdateUsuario,
  useDeleteUsuario,
} from "@/hooks/useUsuarios";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "docente", label: "Docente" },
  { value: "alumno", label: "Alumno" },
];

const EMPTY_FORM_DATA = {
  Email: "",
  PasswordHash: "",
  Rol: "alumno" as UserRole,
  IdDocente: "",
  IdAlumno: "",
  Activo: true,
};

function getFormDataForUser(usuario: Usuario) {
  return {
    Email: usuario.email || "",
    PasswordHash: "",
    Rol: usuario.rol,
    IdDocente: usuario.idDocente?.toString() || "",
    IdAlumno: usuario.idAlumno?.toString() || "",
    Activo: usuario.activo,
  };
}

export default function UsuariosPage() {
  const { usuarios, isLoading, isError } = useGetUsuarios();
  const { mutate: createUsuario, isPending: isCreating } = useCreateUsuario();
  const { mutate: updateUsuario, isPending: isUpdating } = useUpdateUsuario();
  const { mutate: eliminarUsuario } = useDeleteUsuario();

  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<Usuario | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRol, setFilterRol] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  const [formData, setFormData] = useState({ ...EMPTY_FORM_DATA });

  const isProcessing = isCreating || isUpdating;

  const resetForm = () => {
    setUsuarioEnEdicion(null);
    setFormData({ ...EMPTY_FORM_DATA });
  };

  const handleEditClick = (usuario: Usuario) => {
    setUsuarioEnEdicion(usuario);
    setFormData(getFormDataForUser(usuario));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (usuario: Usuario) => {
    if (
      window.confirm(
        `¿Estás seguro de inhabilitar el usuario "${usuario.email}"? (Baja lógica en SQL)`,
      )
    ) {
      eliminarUsuario(usuario.id);
    }
  };

  const usuariosFiltrados = useMemo(() => {
    if (!usuarios) return [];
    return usuarios.filter((u) => {
      const fullText = `${u.email || ""} ${u.id || ""}`.toLowerCase();
      const matchesSearch = fullText.includes(searchQuery.toLowerCase());
      const matchesRol = filterRol === "todos" || u.rol === filterRol;
      return matchesSearch && matchesRol;
    });
  }, [usuarios, searchQuery, filterRol]);

  const totalPages = Math.ceil(usuariosFiltrados.length / ITEMS_PER_PAGE) || 1;
  const usuariosPaginados = usuariosFiltrados.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (usuarioEnEdicion) {
      const payload: UpdateUsuarioPayload = {
        Email: formData.Email,
        Rol: formData.Rol,
        IdDocente: formData.IdDocente ? Number(formData.IdDocente) : undefined,
        IdAlumno: formData.IdAlumno ? Number(formData.IdAlumno) : undefined,
        Activo: formData.Activo,
      };
      if (formData.PasswordHash) {
        payload.PasswordHash = formData.PasswordHash;
      }
      updateUsuario(
        { id: usuarioEnEdicion.id, data: payload },
        { onSuccess: resetForm },
      );
    } else {
      const payload: CreateUsuarioPayload = {
        Email: formData.Email,
        PasswordHash: formData.PasswordHash,
        Rol: formData.Rol,
        IdDocente: formData.IdDocente ? Number(formData.IdDocente) : undefined,
        IdAlumno: formData.IdAlumno ? Number(formData.IdAlumno) : undefined,
        Activo: formData.Activo,
      };
      createUsuario(payload, {
        onSuccess: resetForm,
      });
    }
  };

  return (
    <div className="space-y-6 antialiased">
      <div className="border-b border-slate-200/60 pb-4">
        <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
          Usuarios del Sistema (ABM Credenciales)
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Administración de accesos, roles y estados de cuentas institucionales.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="🔍 Buscar por email o ID..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 font-medium text-slate-700"
        />
        <select
          value={filterRol}
          onChange={(e) => {
            setFilterRol(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none font-medium text-slate-500"
        >
          <option value="todos">Todos los Roles</option>
          <option value="admin">Solo Admin</option>
          <option value="docente">Solo Docentes</option>
          <option value="alumno">Solo Alumnos</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Credenciales Activas
            </h2>
            <span className="text-[10px] font-mono bg-slate-100 font-bold px-2 py-0.5 text-slate-500 rounded-md">
              Coincidencias: {usuariosFiltrados.length}
            </span>
          </div>

          {isError ? (
            <ErrorMessage message="Error al conectar con el microservicio de usuarios." />
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <table className="w-full min-w-[720px] text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-wider select-none">
                      <th className="p-4">ID</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Rol</th>
                      <th className="p-4">ID Asociado</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          Consultando tabla de usuarios...
                        </td>
                      </tr>
                    ) : usuariosPaginados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                          No se encontraron usuarios con esos criterios.
                        </td>
                      </tr>
                    ) : (
                      usuariosPaginados.map((u) => (
                        <tr
                          key={u.id}
                          className={`hover:bg-slate-50/50 transition-colors ${!u.activo ? "opacity-50 bg-slate-50/40" : ""}`}
                        >
                          <td className="p-4 font-mono text-xs font-bold text-slate-700">
                            {u.id}
                          </td>
                          <td className="p-4 max-w-[200px]">
                            <p className="font-semibold text-slate-800 truncate">
                              {u.email}
                            </p>
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                                u.rol === "admin"
                                  ? "bg-purple-50 text-purple-700 border border-purple-100"
                                  : u.rol === "docente"
                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              }`}
                            >
                              {u.rol}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-mono font-medium text-slate-500">
                            {u.idDocente
                              ? `Docente #${u.idDocente}`
                              : u.idAlumno
                                ? `Alumno #${u.idAlumno}`
                                : "—"}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                                u.activo
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-red-50 text-red-700 border border-red-100"
                              }`}
                            >
                              {u.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => handleEditClick(u)}
                                className="text-xs font-bold text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                Editar
                              </button>
                              {u.activo && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClick(u)}
                                  className="text-xs font-bold text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  Dar Baja
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-500">
                <span>
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="px-3 py-1.5 bg-slate-50 text-slate-600 border-slate-200"
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1.5 bg-slate-50 text-slate-600 border-slate-200"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {usuarioEnEdicion ? "Modificar Usuario" : "Registrar Usuario"}
          </h2>
          <form
            onSubmit={handleFormSubmit}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="usuario@cervantes.edu.ar"
                value={formData.Email}
                onChange={(e) =>
                  setFormData({ ...formData, Email: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-medium text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Contraseña {usuarioEnEdicion ? "(dejar vacío para mantener)" : ""}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.PasswordHash}
                onChange={(e) =>
                  setFormData({ ...formData, PasswordHash: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-mono font-medium text-slate-800"
                required={!usuarioEnEdicion}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Rol
              </label>
              <select
                value={formData.Rol}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    Rol: e.target.value as UserRole,
                    IdDocente: "",
                    IdAlumno: "",
                  })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-medium text-slate-700"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.Rol === "docente" && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  ID Docente (Legajo)
                </label>
                <input
                  type="number"
                  placeholder="Ej: 832"
                  value={formData.IdDocente}
                  onChange={(e) =>
                    setFormData({ ...formData, IdDocente: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-mono font-bold text-slate-800"
                />
              </div>
            )}

            {formData.Rol === "alumno" && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  ID Alumno (Matrícula)
                </label>
                <input
                  type="number"
                  placeholder="Ej: 45201"
                  value={formData.IdAlumno}
                  onChange={(e) =>
                    setFormData({ ...formData, IdAlumno: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-mono font-bold text-slate-800"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.Activo}
                onChange={(e) =>
                  setFormData({ ...formData, Activo: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 focus:ring-offset-0 cursor-pointer"
              />
              <label
                htmlFor="activo"
                className="text-xs font-semibold text-slate-600 select-none cursor-pointer"
              >
                Cuenta activa
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-2.5 shadow-sm"
              disabled={isProcessing}
            >
              {isProcessing
                ? "Escribiendo en SQL..."
                : usuarioEnEdicion
                  ? "Guardar Cambios"
                  : "Confirmar Alta"}
            </Button>
            {usuarioEnEdicion && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 mt-1.5 transition-colors"
              >
                Volver a nuevo registro
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
