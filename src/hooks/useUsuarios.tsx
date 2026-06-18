import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllUsuarios,
  crearUsuario,
  updateUsuario,
  deleteUsuario,
} from "@/services/api/usuarios.api";
import type { CreateUsuarioPayload, UpdateUsuarioPayload } from "@/types/index";

export const useGetUsuarios = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["usuarios"],
    queryFn: getAllUsuarios,
  });
  return { usuarios: data, isLoading, isError };
};

export const useCreateUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUsuarioPayload) => crearUsuario(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
};

export const useUpdateUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUsuarioPayload }) =>
      updateUsuario(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
};

export const useDeleteUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUsuario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
};
