import { Usuario, CreateUsuarioPayload, UpdateUsuarioPayload } from "@/types/index";
import { apiFetch } from "@/lib/api";

export const getAllUsuarios = (): Promise<Usuario[]> =>
  apiFetch<Usuario[]>("/usuarios");

export const crearUsuario = (data: CreateUsuarioPayload): Promise<void> =>
  apiFetch<void>("/usuarios", { method: "POST", body: JSON.stringify(data) });

export const updateUsuario = (id: number, data: UpdateUsuarioPayload): Promise<void> =>
  apiFetch<void>(`/usuarios/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteUsuario = (id: number): Promise<void> =>
  apiFetch<void>(`/usuarios/${id}`, { method: "DELETE" });
