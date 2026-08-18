import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportTable, type ReportColumn } from "./ReportTable";

interface Row {
  id: number;
  name: string;
  average: number;
}

type Sort = "name" | "average";

const columns: ReportColumn<Row, Sort>[] = [
  { key: "name", header: "Alumno", sortKey: "name", render: (row) => row.name },
  {
    key: "average",
    header: "Promedio",
    align: "right",
    sortKey: "average",
    render: (row) => row.average.toFixed(2),
  },
];

describe("ReportTable", () => {
  it("alterna orden, pagina y activa filas por teclado", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    const onPageChange = vi.fn();
    const onRowClick = vi.fn();
    render(
      <ReportTable
        columns={columns}
        rows={[{ id: 1, name: "Ada", average: 9 }]}
        rowKey={(row) => row.id}
        sortBy="name"
        sortDirection="asc"
        onSort={onSort}
        onRowClick={onRowClick}
        page={1}
        totalPages={2}
        total={21}
        onPageChange={onPageChange}
        itemLabel="alumnos"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ordenar por Alumno" }));
    expect(onSort).toHaveBeenCalledWith("name", "desc");

    await user.click(screen.getByRole("button", { name: "Ordenar por Promedio" }));
    expect(onSort).toHaveBeenCalledWith("average", "asc");

    const row = screen.getByText("Ada").closest("tr");
    expect(row).toHaveAttribute("tabindex", "0");
    row?.focus();
    await user.keyboard("{Enter}");
    expect(onRowClick).toHaveBeenCalledWith({ id: 1, name: "Ada", average: 9 });

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("muestra vacío y bloquea paginación inexistente", () => {
    render(
      <ReportTable
        columns={columns}
        rows={[]}
        rowKey={(row) => row.id}
        sortBy="name"
        sortDirection="asc"
        onSort={vi.fn()}
        page={1}
        totalPages={0}
        total={0}
        onPageChange={vi.fn()}
        emptyMessage="No hay alumnos para mostrar."
      />,
    );

    expect(screen.getByText("No hay alumnos para mostrar.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });
});
