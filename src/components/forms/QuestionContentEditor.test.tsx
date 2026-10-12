import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuestionContentEditor } from "./QuestionContentEditor";
import type { ExamQuestionVariant } from "@/lib/schemas/examSchema";

describe("QuestionContentEditor", () => {
  it("crea las opciones canónicas al elegir Verdadero/Falso", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionContentEditor
        value={{ id: "q1", enunciado: "", tipo: "mc", opciones: [] }}
        label="Pregunta"
        fieldPrefix=""
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Tipo de pregunta"), "vf");

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "vf",
        opciones: [
          { texto: "Verdadero", esCorrecta: true },
          { texto: "Falso", esCorrecta: false },
        ],
      }),
    );
  });

  it("permite marcar varias respuestas correctas en selección múltiple", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionContentEditor
        value={{
          id: "q1",
          enunciado: "Elegí protocolos",
          tipo: "multiple",
          modoJustificacion: "sin_justificacion",
          estrategiaCorreccion: "exacta",
          tratamientoJustificacion: "informativa",
          opciones: [
            { texto: "TCP", esCorrecta: false },
            { texto: "UDP", esCorrecta: false },
          ],
        }}
        label="Pregunta"
        fieldPrefix=""
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText("Marcar opción 2 como correcta"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        opciones: [
          { texto: "TCP", esCorrecta: false },
          { texto: "UDP", esCorrecta: true },
        ],
      }),
    );
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("normaliza la estrategia al abandonar selección múltiple", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const value: ExamQuestionVariant = {
      id: "q1",
      enunciado: "Elegí protocolos",
      tipo: "multiple",
      modoJustificacion: "opcional",
      estrategiaCorreccion: "parcial_sin_penalizacion",
      tratamientoJustificacion: "revision_manual",
      opciones: [],
    };
    render(
      <QuestionContentEditor
        value={value}
        label="Pregunta"
        fieldPrefix=""
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Tipo de pregunta"), "mc");

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "mc",
        estrategiaCorreccion: "exacta",
        tratamientoJustificacion: "revision_manual",
      }),
    );
  });

  it("vuelve informativa la justificación cuando deja de solicitarse", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionContentEditor
        value={{
          id: "q1",
          enunciado: "Consigna",
          tipo: "mc",
          modoJustificacion: "obligatoria",
          estrategiaCorreccion: "exacta",
          tratamientoJustificacion: "revision_manual",
          opciones: [],
        }}
        label="Pregunta"
        fieldPrefix=""
        onChange={onChange}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText("Justificación del alumno"),
      "sin_justificacion",
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        modoJustificacion: "sin_justificacion",
        tratamientoJustificacion: "informativa",
      }),
    );
  });

  it("oculta y elimina la justificación en preguntas a desarrollar", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionContentEditor
        value={{
          id: "q1",
          enunciado: "Consigna",
          tipo: "mc",
          modoJustificacion: "obligatoria",
          estrategiaCorreccion: "exacta",
          tratamientoJustificacion: "revision_manual",
          opciones: [],
        }}
        label="Pregunta"
        fieldPrefix=""
        onChange={onChange}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText("Tipo de pregunta"),
      "abierta",
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "abierta",
        modoJustificacion: "sin_justificacion",
        tratamientoJustificacion: "informativa",
      }),
    );
  });

  it("no muestra justificación para preguntas de programación", () => {
    render(
      <QuestionContentEditor
        value={{ id: "q1", enunciado: "Consulta", tipo: "code" }}
        label="Pregunta"
        fieldPrefix=""
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByLabelText("Justificación del alumno"),
    ).not.toBeInTheDocument();
  });
});
