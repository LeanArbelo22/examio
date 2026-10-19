import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCorregirPreguntaIntento } from "@/hooks/useEvaluaciones";
import type { PreguntaIntento } from "@/types";
import { QuestionCorrectionCard } from "./QuestionCorrectionCard";

vi.mock("@/hooks/useEvaluaciones", () => ({
  useCorregirPreguntaIntento: vi.fn(),
}));

const useCorrectionMock = vi.mocked(useCorregirPreguntaIntento);
const mutateAsync = vi.fn();

const question: PreguntaIntento = {
  idPregunta: 502,
  enunciado: "Explicá el contrato",
  tipo: "abierta",
  grupoConceptualmente: "Integración",
  puntajeMaximo: 2,
  puntajeObtenido: null,
  origenCorreccion: null,
  comentariosDocente: null,
  corregidoPor: null,
  fechaCorreccion: null,
  respuesta: null,
  opciones: [],
};

describe("QuestionCorrectionCard", () => {
  beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue({});
    useCorrectionMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useCorregirPreguntaIntento>);
  });

  it("permite corregir una pregunta omitida con puntaje parcial", async () => {
    const user = userEvent.setup();
    render(<QuestionCorrectionCard idIntento={73} question={question} />);

    expect(screen.getByText("Sin respuesta.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Puntaje obtenido"), "1.5");
    await user.type(screen.getByLabelText(/Devolución del docente/), "Respuesta parcial");
    await user.click(screen.getByRole("button", { name: "Guardar corrección" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      idPregunta: 502,
      payload: {
        puntajeObtenido: 1.5,
        comentariosDocente: "Respuesta parcial",
      },
    });
  });

  it("rechaza puntajes superiores al máximo", async () => {
    const user = userEvent.setup();
    render(<QuestionCorrectionCard idIntento={73} question={question} />);

    await user.type(screen.getByLabelText("Puntaje obtenido"), "3");
    expect(screen.getByText(/debe estar entre 0 y 2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar corrección" })).toBeDisabled();
  });

  it("permite reemplazar una autocorrección de pregunta cerrada", async () => {
    const user = userEvent.setup();
    render(
      <QuestionCorrectionCard
        idIntento={73}
        question={{
          ...question,
          tipo: "mc",
          puntajeObtenido: 2,
          origenCorreccion: "automatica",
          opciones: [
            { idOpcion: 1, texto: "A", esCorrecta: true, fueSeleccionada: true },
            { idOpcion: 2, texto: "B", esCorrecta: false, fueSeleccionada: false },
          ],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Asignar cero" }));
    await user.click(screen.getByRole("button", { name: "Guardar corrección" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      idPregunta: 502,
      payload: { puntajeObtenido: 0, comentariosDocente: null },
    });
  });

  it("muestra la justificación y el puntaje sugerido para revisión manual", () => {
    render(
      <QuestionCorrectionCard
        idIntento={73}
        question={{
          ...question,
          tipo: "multiple",
          modoJustificacion: "obligatoria",
          estrategiaCorreccion: "parcial_penalizada",
          tratamientoJustificacion: "revision_manual",
          puntajeAutomaticoOpciones: 1.25,
          respuesta: {
            idRespuesta: 90,
            rtaTexto: null,
            justificacion: "Ambas opciones cumplen la condición.",
          },
        }}
      />,
    );

    expect(screen.getByText("Selección múltiple")).toBeVisible();
    expect(screen.getByText("Ambas opciones cumplen la condición.")).toBeVisible();
    expect(screen.getByText("Requiere revisión docente")).toBeVisible();
    expect(screen.getByText("Puntaje parcial con descuento")).toBeVisible();
    expect(screen.getByText(/requiere revisión docente antes de definir el puntaje/)).toBeVisible();
    expect(screen.getByText(/1.25/)).toBeVisible();
  });

  it("explica la coincidencia exacta aplicada a una pregunta cerrada", () => {
    render(
      <QuestionCorrectionCard
        idIntento={73}
        question={{
          ...question,
          tipo: "multiple",
          estrategiaCorreccion: "exacta",
          puntajeObtenido: 0,
          origenCorreccion: "automatica",
          opciones: [
            { idOpcion: 1, texto: "A", esCorrecta: true, fueSeleccionada: true },
            { idOpcion: 2, texto: "B", esCorrecta: true, fueSeleccionada: false },
          ],
        }}
      />,
    );

    expect(screen.getByText("Coincidencia exacta")).toBeVisible();
    expect(screen.getByText(/debe coincidir completamente/)).toBeVisible();
  });

  it("distingue opciones correctas elegidas de correctas no elegidas", () => {
    render(
      <QuestionCorrectionCard
        idIntento={73}
        question={{
          ...question,
          tipo: "multiple",
          puntajeObtenido: 0.75,
          puntajeAutomaticoOpciones: 0.75,
          origenCorreccion: "automatica",
          opciones: [
            { idOpcion: 1, texto: "A", esCorrecta: true, fueSeleccionada: true },
            { idOpcion: 2, texto: "B", esCorrecta: true, fueSeleccionada: true },
            { idOpcion: 3, texto: "C", esCorrecta: true, fueSeleccionada: true },
            { idOpcion: 4, texto: "D", esCorrecta: true, fueSeleccionada: false },
          ],
        }}
      />,
    );

    expect(screen.getByText("Seleccionó 3 de 4 opciones correctas.")).toBeVisible();
    expect(screen.getAllByText("Elegida · correcta")).toHaveLength(3);
    expect(screen.getByText("Correcta no elegida")).toBeVisible();
  });
});
