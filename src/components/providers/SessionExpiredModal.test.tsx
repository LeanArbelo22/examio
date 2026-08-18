import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionAuthError } from "@/types/auth";
import { SessionExpiredModal } from "./SessionExpiredModal";

const authMocks = vi.hoisted(() => ({
  pathname: "/profesor",
  session: undefined as
    | { authError?: SessionAuthError; user?: { name: string } }
    | undefined,
  update: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => authMocks.pathname,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: authMocks.session, update: authMocks.update }),
  signOut: authMocks.signOut,
}));

describe("SessionExpiredModal", () => {
  beforeEach(() => {
    authMocks.pathname = "/profesor";
    authMocks.session = undefined;
    authMocks.update.mockReset();
    authMocks.signOut.mockReset();
  });

  it("fuera del examen ofrece login y ejecuta el logout controlado", async () => {
    const user = userEvent.setup();
    authMocks.session = {
      user: { name: "Docente" },
      authError: "REFRESH_TOKEN_REVOKED",
    };
    authMocks.signOut.mockResolvedValue(undefined);
    render(<SessionExpiredModal />);

    expect(
      screen.getByRole("heading", { name: "Tu sesión necesita atención" }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Volver a iniciar sesión" }),
    );

    expect(authMocks.signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });

  it("dentro del examen permite continuar y suprime eventos repetidos del mismo intento", async () => {
    const user = userEvent.setup();
    authMocks.pathname = "/alumno/examen/73/actividad/1";
    authMocks.session = {
      user: { name: "Alumno" },
      authError: "REFRESH_TOKEN_REVOKED",
    };
    render(<SessionExpiredModal />);

    expect(
      screen.getByRole("heading", { name: "No pudimos sincronizar tu sesión" }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Continuar en el examen" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    window.dispatchEvent(
      new CustomEvent("EXAMIO_SESSION_PROBLEM", {
        detail: { code: "REFRESH_TOKEN_REVOKED" },
      }),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(authMocks.signOut).not.toHaveBeenCalled();
  });

  it("permite reintentar un fallo transitorio y cierra el modal al recuperarse", async () => {
    const user = userEvent.setup();
    authMocks.pathname = "/alumno/examen/73/actividad/1";
    authMocks.session = {
      user: { name: "Alumno" },
      authError: "AUTH_INFRASTRUCTURE_ERROR",
    };
    authMocks.update.mockImplementation(async () => {
      authMocks.session = { user: { name: "Alumno" } };
      return authMocks.session;
    });
    render(<SessionExpiredModal />);

    await user.click(screen.getByRole("button", { name: "Reintentar sesión" }));

    expect(authMocks.update).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(authMocks.signOut).not.toHaveBeenCalled();
  });
});
