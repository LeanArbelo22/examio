import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ActivityPage from "./page";

const questionState = vi.hoisted(() => ({
  type: "mc",
  mode: "sin_justificacion",
}));
const saveAnswer = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useEvaluaciones", () => ({
  useGetExamenSorteado: () => ({
    data: [
      {
        idPregunta: 15,
        enunciado: "¿Qué consulta es correcta?",
        tipo: questionState.type,
        modoJustificacion: questionState.mode,
        tratamientoJustificacion: "informativa",
        puntajeMaximo: 3.34,
        respuesta: null,
      },
    ],
    refetch: vi.fn(),
  }),
  useGetOpcionesPregunta: () => ({
    data: [
      { idOpcion: 1, texto: "Primera" },
      { idOpcion: 2, texto: "Segunda" },
    ],
    refetch: vi.fn(),
  }),
  useGuardarRespuesta: () => ({
    mutate: saveAnswer,
    isPending: false,
    persistPending: vi.fn(),
    restoreServerAnswer: vi.fn(),
    retryLocalAnswer: vi.fn(),
  }),
  usePendingAnswer: () => undefined,
}));

describe("ActivityPage", () => {
  it("muestra el puntaje sólo cuando el render del backend lo incluye", async () => {
    questionState.type = "mc";
    questionState.mode = "sin_justificacion";
    await act(async () => {
      render(
        <ActivityPage
          params={Promise.resolve({ id: "73", actividadId: "1" })}
        />,
      );
    });

    expect(screen.getByText("3.34 puntos")).toBeVisible();
  });

  it("permite seleccionar varias opciones y justificar debajo de ellas", async () => {
    const user = userEvent.setup();
    questionState.type = "multiple";
    questionState.mode = "obligatoria";
    saveAnswer.mockClear();

    await act(async () => {
      render(
        <ActivityPage
          params={Promise.resolve({ id: "73", actividadId: "1" })}
        />,
      );
    });

    const choices = screen.getAllByRole("checkbox");
    expect(choices).toHaveLength(2);
    await user.click(choices[0]);
    await user.click(choices[1]);

    expect(saveAnswer).toHaveBeenLastCalledWith(
      expect.objectContaining({ IdOpcionesSeleccionadas: [1, 2] }),
    );
    expect(screen.getByLabelText("Justificación")).toBeVisible();
    expect(
      screen.getByText(/se registrará como “Sin respuesta”/i),
    ).toBeVisible();
  });
});
