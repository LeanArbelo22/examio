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
  completeMissingJustifications: vi.fn(),
  finalizarExamen: vi.fn(),
  questions: [{
    idPregunta: 15,
    enunciado: "Pregunta",
    tipo: "mc",
    modoJustificacion: "sin_justificacion",
    respuesta: null,
  }],
  answers: [] as Array<Record<string, unknown>>,
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
    data: examMocks.questions,
    isLoading: false,
  }),
  usePrecargarOpcionesExamen: vi.fn(),
  useFinalizarExamen: () => ({
    mutateAsync: examMocks.finalizarExamen,
    isPending: false,
  }),
  useExamAnswerSync: () => ({
    snapshot: { answers: examMocks.answers, finalizeRequested: false, durable: true },
    isOnline: true,
    isSyncing: false,
    syncRevision: 0,
    syncNow: examMocks.syncNow,
    completeMissingJustifications: examMocks.completeMissingJustifications,
    requestFinalization: examMocks.requestFinalization,
    cancelFinalization: examMocks.cancelFinalization,
    clearOutbox: examMocks.clearOutbox,
  }),
}));

vi.mock("@/hooks/useTelemetria", () => ({
  useFocusIncidentTracking: vi.fn(),
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
    examMocks.routerPush.mockReset();
    examMocks.routerReplace.mockReset();
    examMocks.requestFinalization.mockReset();
    examMocks.cancelFinalization.mockReset();
    examMocks.clearOutbox.mockReset();
    examMocks.syncNow.mockReset();
    examMocks.completeMissingJustifications.mockReset();
    examMocks.finalizarExamen.mockReset();
    examMocks.requestFinalization.mockResolvedValue(undefined);
    examMocks.cancelFinalization.mockResolvedValue(undefined);
    examMocks.clearOutbox.mockResolvedValue(undefined);
    examMocks.completeMissingJustifications.mockResolvedValue(0);
    examMocks.finalizarExamen.mockResolvedValue({ notaFinal: 8 });
    examMocks.questions = [{
      idPregunta: 15,
      enunciado: "Pregunta",
      tipo: "mc",
      modoJustificacion: "sin_justificacion",
      respuesta: null,
    }];
    examMocks.answers = [];
  });

  it("completa la justificación vacía antes de sincronizar y entregar", async () => {
    const user = userEvent.setup();
    examMocks.questions = [{
      idPregunta: 15,
      enunciado: "Pregunta",
      tipo: "multiple",
      modoJustificacion: "obligatoria",
      respuesta: {
        idsOpcionesSeleccionadas: [1, 2],
        justificacion: null,
        revision: 1,
      },
    }];
    examMocks.completeMissingJustifications.mockResolvedValue(1);
    examMocks.syncNow.mockResolvedValue({
      synchronizedQuestions: [15],
      snapshot: { answers: [], finalizeRequested: true, durable: true },
    });
    await renderActivityLayout();

    await user.click(screen.getByRole("button", { name: "Finalizar Examen ✓" }));
    expect(screen.getByText(/se registrarán como “Sin respuesta”/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Entregar Examen" }));

    await waitFor(() => expect(examMocks.finalizarExamen).toHaveBeenCalledWith(73));
    expect(examMocks.completeMissingJustifications).toHaveBeenCalledWith(
      examMocks.questions,
    );
    const order = [
      examMocks.completeMissingJustifications,
      examMocks.requestFinalization,
      examMocks.syncNow,
      examMocks.finalizarExamen,
    ].map((mock) => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
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
