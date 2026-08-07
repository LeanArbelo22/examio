import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormFieldError } from "./FormFieldError";

describe("FormFieldError", () => {
  it("expone el mensaje como alerta asociable al campo", () => {
    render(<FormFieldError id="titulo-error" message="Ingresá un título" />);

    expect(screen.getByRole("alert")).toHaveAttribute("id", "titulo-error");
    expect(screen.getByText("Ingresá un título")).toBeVisible();
  });

  it("no renderiza contenido cuando no hay mensaje", () => {
    const { container } = render(<FormFieldError id="titulo-error" />);
    expect(container).toBeEmptyDOMElement();
  });
});
