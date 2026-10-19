import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActualizarPoliticaRevision, useAuditoriaRevision, usePoliticaRevision } from "@/hooks/useRevisiones";
import { ReviewPolicyPanel } from "./ReviewPolicyPanel";

vi.mock("@/hooks/useRevisiones", () => ({
  useActualizarPoliticaRevision: vi.fn(),
  useAuditoriaRevision: vi.fn(),
  usePoliticaRevision: vi.fn(),
}));

const policyMock = vi.mocked(usePoliticaRevision);
const updateMock = vi.mocked(useActualizarPoliticaRevision);
const auditMock = vi.mocked(useAuditoriaRevision);
const mutateAsync = vi.fn();

describe("ReviewPolicyPanel", () => {
  beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue({});
    policyMock.mockReturnValue({
      data: {
        idPublicacion: 41, modo: "al_corregir", acceso: "libre",
        ventanaDesde: null, ventanaHasta: null, revision: 3,
        modificadoPor: 8, fechaModificacion: "2026-10-18T10:00:00.000Z",
      },
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePoliticaRevision>);
    updateMock.mockReturnValue({
      mutateAsync, isPending: false, isError: false, isSuccess: false, error: null,
    } as unknown as ReturnType<typeof useActualizarPoliticaRevision>);
    auditMock.mockReturnValue({
      data: { items: [], pagination: { page: 1, limit: 15, total: 0, totalPages: 0 } },
      isLoading: false, isError: false, error: null,
    } as unknown as ReturnType<typeof useAuditoriaRevision>);
  });

  it("guarda una ventana con la revisión optimista vigente", async () => {
    const user = userEvent.setup();
    render(<ReviewPolicyPanel idPublicacion={41} />);

    await user.selectOptions(screen.getByLabelText(/Cuándo se permite/), "ventana");
    await user.clear(screen.getByLabelText("Disponible desde"));
    await user.type(screen.getByLabelText("Disponible desde"), "2026-10-20T09:00");
    await user.clear(screen.getByLabelText("Disponible hasta"));
    await user.type(screen.getByLabelText("Disponible hasta"), "2026-10-20T10:00");
    await user.click(screen.getByRole("button", { name: "Guardar configuración" }));

    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      Modo: "ventana",
      Acceso: "libre",
      RevisionEsperada: 3,
      VentanaDesde: expect.stringContaining("2026-10-20"),
      VentanaHasta: expect.stringContaining("2026-10-20"),
    }));
  });

  it("oculta la cantidad de accesos cuando la revisión está deshabilitada o es individual", async () => {
    const user = userEvent.setup();
    render(<ReviewPolicyPanel idPublicacion={41} />);

    expect(screen.getByLabelText(/Cuántas veces puede verla/)).toBeVisible();
    await user.selectOptions(screen.getByLabelText(/Cuándo se permite/), "nunca");
    expect(screen.queryByLabelText(/Cuántas veces puede verla/)).not.toBeInTheDocument();
    expect(screen.getByText(/aunque tenga una autorización anterior/)).toBeVisible();

    await user.selectOptions(screen.getByLabelText(/Cuándo se permite/), "manual");
    expect(screen.queryByLabelText(/Cuántas veces puede verla/)).not.toBeInTheDocument();
    expect(screen.getByText(/Autorizá cada intento desde su pantalla de corrección/)).toBeVisible();
  });
});
