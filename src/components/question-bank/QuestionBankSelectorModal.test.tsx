import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  useEtiquetasBanco,
  useGruposBanco,
  usePreguntasBanco,
  useResolverSeleccionBanco,
} from "@/hooks/useBancoPreguntas";
import { QuestionBankSelectorModal } from "./QuestionBankSelectorModal";

vi.mock("@/hooks/useBancoPreguntas", () => ({
  useEtiquetasBanco: vi.fn(),
  useGruposBanco: vi.fn(),
  usePreguntasBanco: vi.fn(),
  useResolverSeleccionBanco: vi.fn(),
}));

const question = {
  id: 10,
  idDocente: 1,
  titulo: "Pregunta TCP",
  resumen: "Protocolos de transporte",
  tipo: "mc" as const,
  estado: "disponible" as const,
  revision: 2,
  fechaCreacion: "2026-09-01T10:00:00.000Z",
  fechaActualizacion: "2026-09-01T10:00:00.000Z",
};

describe("QuestionBankSelectorModal", () => {
  it("selecciona contenido disponible y devuelve una importación versionada", async () => {
    vi.mocked(useEtiquetasBanco).mockReturnValue({ data: [], isLoading: false } as never);
    vi.mocked(usePreguntasBanco).mockReturnValue({
      data: { items: [question], total: 1, pagina: 1, tamano: 10 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useGruposBanco).mockReturnValue({
      data: { items: [], total: 0, pagina: 1, tamano: 10 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    const mutateAsync = vi.fn(async (selection) => ({
      preguntas: selection.preguntas,
      grupos: [],
    }));
    vi.mocked(useResolverSeleccionBanco).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <QuestionBankSelectorModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        excludedQuestionIds={[]}
        excludedGroupIds={[]}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: /Pregunta TCP/ }));
    await user.click(screen.getByRole("button", { name: "Agregar selección" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    expect(onConfirm.mock.calls[0][0][0].payload).toEqual({
      Tipo: "pregunta",
      IdPregunta: 10,
      RevisionEsperada: 2,
      TituloReferencia: "Pregunta TCP",
    });
  });
});
