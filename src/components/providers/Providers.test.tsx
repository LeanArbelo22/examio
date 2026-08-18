import { useMutation, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { Providers } from "./Providers";

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./SessionExpiredModal", () => ({
  SessionExpiredModal: () => null,
}));

function FailingQuery({ error }: { error: ApiError }) {
  const query = useQuery({
    queryKey: ["provider-query-error", error.code],
    queryFn: () => Promise.reject(error),
  });
  return <span>{query.status}</span>;
}

function FailingMutation({ error }: { error: ApiError }) {
  const mutation = useMutation({
    mutationFn: () => Promise.reject(error),
  });
  return (
    <button type="button" onClick={() => mutation.mutate()}>
      Ejecutar mutación
    </button>
  );
}

describe("Providers session error propagation", () => {
  const listeners: Array<(event: Event) => void> = [];

  afterEach(() => {
    for (const listener of listeners) {
      window.removeEventListener("EXAMIO_SESSION_PROBLEM", listener);
    }
    listeners.length = 0;
  });

  function observeSessionProblems() {
    const listener = vi.fn<(event: Event) => void>();
    listeners.push(listener);
    window.addEventListener("EXAMIO_SESSION_PROBLEM", listener);
    return listener;
  }

  it("propaga un error terminal desde QueryCache con su código", async () => {
    const listener = observeSessionProblems();
    render(
      <Providers>
        <FailingQuery
          error={new ApiError("Sesión revocada", 401, "REFRESH_TOKEN_REVOKED")}
        />
      </Providers>,
    );

    await waitFor(() => expect(listener).toHaveBeenCalledOnce());
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      code: "REFRESH_TOKEN_REVOKED",
    });
  });

  it("propaga un error terminal desde MutationCache", async () => {
    const user = userEvent.setup();
    const listener = observeSessionProblems();
    render(
      <Providers>
        <FailingMutation
          error={new ApiError("Sesión inexistente", 401, "SESSION_UNAVAILABLE")}
        />
      </Providers>,
    );

    await user.click(screen.getByRole("button", { name: "Ejecutar mutación" }));
    await waitFor(() => expect(listener).toHaveBeenCalledOnce());
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      code: "SESSION_UNAVAILABLE",
    });
  });

  it.each([
    new ApiError("Sin permisos", 403, "FORBIDDEN"),
    new ApiError("Token inválido", 401, "ACCESS_TOKEN_INVALID"),
    new ApiError("Sin red", 0, "NETWORK_UNAVAILABLE"),
    new ApiError("Validación", 400, "REQUEST_INVALID"),
  ])("no convierte %s en un problema terminal de sesión", async (error) => {
    const listener = observeSessionProblems();
    render(
      <Providers>
        <FailingQuery error={error} />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText("error")).toBeVisible());
    expect(listener).not.toHaveBeenCalled();
  });
});
