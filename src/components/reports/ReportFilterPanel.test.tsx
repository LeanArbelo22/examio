import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportFilterPanel } from "./ReportFilterPanel";

describe("ReportFilterPanel", () => {
  const definitions = [
    { key: "matricula", label: "Matrícula", type: "number" as const },
    {
      key: "estado",
      label: "Estado",
      type: "select" as const,
      options: [{ value: "entregado", label: "Entregado" }],
    },
  ];

  it("mantiene un borrador y lo entrega solamente al buscar", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(
      <ReportFilterPanel
        filters={{ matricula: "", estado: "" }}
        definitions={definitions}
        onSearch={onSearch}
        onClear={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Matrícula"), "30123");
    await user.selectOptions(screen.getByLabelText("Estado"), "entregado");
    expect(onSearch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(onSearch).toHaveBeenCalledWith({
      matricula: "30123",
      estado: "entregado",
    });
  });

  it("delega la limpieza al consumidor", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <ReportFilterPanel
        filters={{ matricula: "30123", estado: "" }}
        definitions={definitions}
        onSearch={vi.fn()}
        onClear={onClear}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
