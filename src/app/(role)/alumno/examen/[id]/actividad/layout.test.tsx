import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActivityLayout from "./layout";

const examMocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  requestFinalization: vi.fn(),
  cancelFinalization: vi.fn(),
  clearOutbox: vi.fn(),
  syncNow: vi.fn(),
  finalizarExamen: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: examMocks.routerPush,
    replace: examMocks.routerReplace,
  }),
  useParams: () => ({ actividadId: "1" }),
}));

vi.mock("@/components/ui/FullscreenWrapper", () => ({
  FullscreenWrapper: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/hooks/useEvaluaciones", () => ({
  useGetExamenSorteado: () => ({
    data: [{ idPregunta: 15, texto: "Pregunta", tipo: "multiple_choice" }],
    isLoading: false,
  }),
  usePrecargarOpcionesExamen: vi.fn(),
  useFinalizarExamen: () => ({
    mutateAsync: examMocks.finalizarExamen,
    isPending: false,
  }),
  useExamAnswerSync: () => ({
    snapshot: { answers: [], finalizeRequested: false, durable: true },
    isOnline: true,
    isSyncing: false,
    syncRevision: 0,
    syncNow: examMocks.syncNow,
    requestFinalization: examMocks.requestFinalization,
    cancelFinalization: examMocks.cancelFinalization,
    clearOutbox: examMocks.clearOutbox,
  }),
}));

async function renderActivityLayout() {
  await act(async () => {
    render(
      <ActivityLayout params={Promise.resolve({ id: "73" })}>
        <div>Contenido del examen</div>
      </ActivityLayout>,
    );
  });
  await screen.findByText("Contenido del examen");
}

describe("finalización coordinada del examen", () => {
  beforeEach(() => {
    for (const mock of Object.values(examMocks)) mock.mockReset();
    examMocks.requestFinalization.mockResolvedValue(undefined);
    examMocks.cancelFinalization.mockResolvedValue(undefined);
    examMocks.clearOutbox.mockResolvedValue(undefined);
    examMocks.finalizarExamen.mockResolvedValue({ notaFinal: 8 });
  });

  it("registra, sincroniza, finaliza y limpia en ese orden", async () => {
    const user = userEvent.setup();
    examMocks.syncNow.mockResolvedValue({
      synchronizedQuestions: [15],
      snapshot: { answers: [], finalizeRequested: true, durable: true },
    });
    await renderActivityLayout();

    await user.click(screen.getByRole("button", { name: "Finalizar Examen ✓" }));
    await user.click(screen.getByRole("button", { name: "Entregar Examen" }));

    await waitFor(() =>
      expect(examMocks.routerReplace).toHaveBeenCalledWith("/alumno"),
    );
    expect(examMocks.finalizarExamen).toHaveBeenCalledWith(73);
    const order = [
      examMocks.requestFinalization,
      examMocks.syncNow,
      examMocks.finalizarExamen,
      examMocks.clearOutbox,
    ].map((mock) => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("no entrega con respuestas pendientes y ofrece una salida controlada", async () => {
    const user = userEvent.setup();
    examMocks.syncNow.mockResolvedValue({
      synchronizedQuestions: [],
      snapshot: {
        answers: [{ key: "73:15", idPregunta: 15 }],
        finalizeRequested: true,
        durable: true,
      },
    });
    await renderActivityLayout();

    await user.click(screen.getByRole("button", { name: "Finalizar Examen ✓" }));
    await user.click(screen.getByRole("button", { name: "Entregar Examen" }));

    expect(
      await screen.findByText(/Todavía hay respuestas pendientes/),
    ).toBeVisible();
    expect(examMocks.finalizarExamen).not.toHaveBeenCalled();
    expect(examMocks.clearOutbox).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", {
        name: "Salir al panel y mantener el intento abierto",
      }),
    );
    expect(examMocks.cancelFinalization).toHaveBeenCalledOnce();
    expect(examMocks.routerReplace).toHaveBeenCalledWith("/alumno");
  });
});
