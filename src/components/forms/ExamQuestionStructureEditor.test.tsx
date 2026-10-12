import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExamQuestionStructureEditor } from "./ExamQuestionStructureEditor";

const group = {
  id: 1,
  tituloReferencia: "Redes",
  variantes: [
    {
      id: "4e096ceb-51fd-49a1-8f80-c3760edaf021",
      enunciado: "Explicá TCP",
      tipo: "abierta" as const,
    },
  ],
};

describe("ExamQuestionStructureEditor", () => {
  it("ubica el botón para añadir debajo del último grupo", () => {
    render(
      <ExamQuestionStructureEditor
        groups={[group]}
        errors={{}}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    );

    const article = screen.getByDisplayValue("Redes").closest("article");
    const addButton = screen.getByRole("button", {
      name: "+ Añadir Pregunta Estructural",
    });

    expect(article).not.toBeNull();
    expect(
      article!.compareDocumentPosition(addButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("expone guardado individual de variante y grupo", async () => {
    const user = userEvent.setup();
    const saveGroup = vi.fn();
    const saveVariant = vi.fn();
    render(
      <ExamQuestionStructureEditor
        groups={[group]}
        errors={{}}
        onChange={vi.fn()}
        onBlur={vi.fn()}
        onSaveGroupToBank={saveGroup}
        onSaveVariantToBank={saveVariant}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Guardar grupo en banco" }));
    await user.click(screen.getByRole("button", { name: "Guardar en banco" }));

    expect(saveGroup).toHaveBeenCalledWith(0);
    expect(saveVariant).toHaveBeenCalledWith(0, 0);
  });

  it("permite editar el puntaje del grupo en modo personalizado", async () => {
    const onChange = vi.fn();
    render(
      <ExamQuestionStructureEditor
        groups={[{ ...group, puntajeMaximo: "4" }]}
        errors={{}}
        onChange={onChange}
        onBlur={vi.fn()}
        scoringScale={10}
        scoringMode="personalizados"
      />,
    );

    const input = screen.getByLabelText("Puntaje máximo");
    fireEvent.change(input, { target: { value: "6" } });

    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ puntajeMaximo: "6" }),
    ]);
  });
});
