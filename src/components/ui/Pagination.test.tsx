import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("limita la página visible y deshabilita retroceder en la primera página", () => {
    render(
      <Pagination page={0} totalPages={3} total={25} itemLabel="alumnos" onPageChange={vi.fn()} />,
    );

    expect(screen.getByText("Página 1 de 3 · 25 alumnos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();
  });

  it("notifica la página siguiente", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={4} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(onPageChange).toHaveBeenCalledOnce();
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("deshabilita ambos controles cuando no hay páginas", () => {
    render(<Pagination page={1} totalPages={0} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });
});
