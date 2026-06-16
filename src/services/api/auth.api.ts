import { apiFetch } from "@/lib/api";
import { LoginPayload, LoginResponse } from "@/types/index";

export const login = (payload: LoginPayload): Promise<LoginResponse> =>
  apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
