import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGuardarPermisoRevision, usePermisosRevision, usePoliticaRevision, useRevocarPermisoRevision } from "@/hooks/useRevisiones";
import type { IntentoCompleto } from "@/types";
import { AttemptReviewPermission } from "./AttemptReviewPermission";

vi.mock("@/hooks/useRevisiones", () => ({
  useGuardarPermisoRevision: vi.fn(),
  usePermisosRevision: vi.fn(),
  usePoliticaRevision: vi.fn(),
  useRevocarPermisoRevision: vi.fn(),
}));

const permissionsMock = vi.mocked(usePermisosRevision);
const policyMock = vi.mocked(usePoliticaRevision);
const saveMock = vi.mocked(useGuardarPermisoRevision);
const revokeMock = vi.mocked(useRevocarPermisoRevision);
const save = vi.fn();

const attempt = {
  idIntento: 73, idAlumno: 30500, idPublicacion: 41, estado: "entregado",
  correccionConfirmada: true,
} as unknown as IntentoCompleto;

describe("AttemptReviewPermission", () => {
  beforeEach(() => {
    save.mockReset().mockResolvedValue({});
    permissionsMock.mockReturnValue({
      data: [], isLoading: false, isError: false, error: null,
    } as unknown as ReturnType<typeof usePermisosRevision>);
    policyMock.mockReturnValue({
      data: {
        idPublicacion: 41, modo: "manual", acceso: "libre",
        ventanaDesde: null, ventanaHasta: null, revision: 2,
        modificadoPor: 8, fechaModificacion: "2026-10-19T10:00:00.000Z",
      },
      isLoading: false, isError: false, error: null,
    } as unknown as ReturnType<typeof usePoliticaRevision>);
    saveMock.mockReturnValue({
      mutateAsync: save, isPending: false, isError: false, isSuccess: false, error: null,
    } as unknown as ReturnType<typeof useGuardarPermisoRevision>);
    revokeMock.mockReturnValue({
      mutateAsync: vi.fn(), isPending: false, isError: false, isSuccess: false, error: null,
    } as unknown as ReturnType<typeof useRevocarPermisoRevision>);
  });

  it("otorga un permiso individual con revisión inicial cero", async () => {
    const user = userEvent.setup();
    render(<AttemptReviewPermission attempt={attempt} />);
    await user.type(screen.getByLabelText("Motivo (opcional)"), "Solicitud del alumno");
    await user.click(screen.getByRole("button", { name: "Autorizar revisión" }));

    expect(save).toHaveBeenCalledWith({
      Acceso: "libre", FechaDesde: null, FechaHasta: null,
      Motivo: "Solicitud del alumno", RevisionEsperada: 0,
    });
  });

  it("no permite crear autorizaciones mientras la revisión general está deshabilitada", () => {
    policyMock.mockReturnValue({
      data: {
        idPublicacion: 41, modo: "nunca", acceso: "libre",
        ventanaDesde: null, ventanaHasta: null, revision: 3,
        modificadoPor: 8, fechaModificacion: "2026-10-19T10:00:00.000Z",
      },
      isLoading: false, isError: false, error: null,
    } as unknown as ReturnType<typeof usePoliticaRevision>);

    render(<AttemptReviewPermission attempt={attempt} />);

    expect(screen.getByText(/deshabilitada para toda la evaluación/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Autorizar revisión" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Cuántas veces puede verla/)).not.toBeInTheDocument();
  });
});
