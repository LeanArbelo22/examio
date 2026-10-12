import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { Breadcrumbs } from "./Breadcrumbs";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const usePathnameMock = vi.mocked(usePathname);

describe("Breadcrumbs", () => {
  beforeEach(() => usePathnameMock.mockReset());

  it("muestra una etiqueta legible para crear una actividad", () => {
    usePathnameMock.mockReturnValue("/profesor/crear-examen");

    render(<Breadcrumbs />);

    expect(screen.getByText("Crear actividad")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Crear-examen")).not.toBeInTheDocument();
  });

  it("no enlaza la ruta técnica de evaluaciones que redirige al panel", () => {
    usePathnameMock.mockReturnValue("/profesor/examen/2051");

    render(<Breadcrumbs />);

    expect(screen.getByText("Evaluaciones")).not.toHaveAttribute("href");
    expect(screen.getByText("Evaluación #2051")).toHaveAttribute("aria-current", "page");
  });

  it("conserva el enlace a una evaluación real desde su detalle", () => {
    usePathnameMock.mockReturnValue("/profesor/examen/2051/detalle");

    render(<Breadcrumbs />);

    expect(screen.getByRole("link", { name: "Evaluación #2051" })).toHaveAttribute(
      "href",
      "/profesor/examen/2051",
    );
    expect(screen.getByText("Detalle")).toHaveAttribute("aria-current", "page");
  });

  it("no enlaza la ruta técnica al ver un intento", () => {
    usePathnameMock.mockReturnValue("/profesor/intento/2089");

    render(<Breadcrumbs />);

    expect(screen.getByText("Intentos")).not.toHaveAttribute("href");
    expect(screen.getByText("Intento #2089")).toHaveAttribute("aria-current", "page");
  });
});
