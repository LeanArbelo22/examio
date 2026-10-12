import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ActivityPage from "./page";

const questionState = vi.hoisted(() => ({ type: "mc" }));

vi.mock("@/hooks/useEvaluaciones", () => ({
  useGetExamenSorteado: () => ({
    data: [
      {
        idPregunta: 15,
        enunciado: "¿Qué consulta es correcta?",
        tipo: questionState.type,
        puntajeMaximo: 3.34,
      },
    ],
  }),
  useGetOpcionesPregunta: () => ({ data: [] }),
  useGuardarRespuesta: () => ({
    mutate: vi.fn(),
    isPending: false,
    persistPending: vi.fn(),
  }),
  usePendingAnswer: () => undefined,
}));

describe("ActivityPage", () => {
  it("muestra el puntaje sólo cuando el render del backend lo incluye", async () => {
    questionState.type = "mc";
    await act(async () => {
      render(
        <ActivityPage
          params={Promise.resolve({ id: "73", actividadId: "1" })}
        />,
      );
    });

    expect(screen.getByText("3.34 puntos")).toBeVisible();
  });

  it("no interpreta selección múltiple con el runtime legacy", async () => {
    questionState.type = "multiple";

    await act(async () => {
      render(
        <ActivityPage
          params={Promise.resolve({ id: "73", actividadId: "1" })}
        />,
      );
    });

    expect(
      screen.getByText(/todavía no está disponible para ser respondida/i),
    ).toBeVisible();
    expect(screen.queryByText("Seleccioná una opción:")).not.toBeInTheDocument();
  });
});
