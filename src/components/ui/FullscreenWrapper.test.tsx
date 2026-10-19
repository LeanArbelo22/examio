import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { EstadoSupervisionIntento } from "@/types";
import { FullscreenWrapper } from "./FullscreenWrapper";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/hooks/useEvaluaciones", () => ({
  useRegistrarAlerta: () => ({ mutate: vi.fn() }),
}));

const supervision = (revision: number): EstadoSupervisionIntento => ({
  idIntento: 73,
  estado: "advertido",
  accion: "advertir",
  interaccionBloqueada: false,
  intentoAnulado: false,
  pantallaCompletaObligatoria: false,
  revision,
  fechaActualizacion: "2026-10-17T09:36:50.000Z",
});

describe("FullscreenWrapper", () => {
  it("no repite una advertencia descartada cuando sólo cambia la revisión", async () => {
    const user = userEvent.setup();
    const props = {
      idIntento: 73,
      telemetryDurable: true,
      onFullscreenViolation: vi.fn(),
      onFullscreenRestored: vi.fn(),
    };
    const { rerender } = render(
      <FullscreenWrapper {...props} supervision={supervision(2)} warningDecisionId={81}>
        <p>Examen</p>
      </FullscreenWrapper>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Se registró una interrupción");
    await user.click(screen.getByRole("button", { name: "Entendido" }));

    rerender(
      <FullscreenWrapper {...props} supervision={supervision(3)} warningDecisionId={81}>
        <p>Examen</p>
      </FullscreenWrapper>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(
      <FullscreenWrapper {...props} supervision={supervision(4)} warningDecisionId={82}>
        <p>Examen</p>
      </FullscreenWrapper>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
