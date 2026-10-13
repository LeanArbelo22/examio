import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGetIntentoCompleto } from "@/hooks/useEvaluaciones";
import RevisionAlumnoPage from "./page";

vi.mock("@/hooks/useEvaluaciones", () => ({
  useGetIntentoCompleto: vi.fn(),
}));

const useAttemptMock = vi.mocked(useGetIntentoCompleto);

const attempt = {
  idIntento: 73,
  idAlumno: 30500,
  idPublicacion: 9,
  estado: "entregado" as const,
  notaFinal: 7,
  notaAutomatica: 7,
  notaFinalCalculada: 7,
  notaFinalManual: null,
  escalaCalificacion: 10 as const,
  notaAprobacion: 4,
  fechaInicio: "2026-10-12T12:00:00.000Z",
  fechaFin: "2026-10-12T13:00:00.000Z",
  numeroIntento: 1,
  nombre: "Ana",
  apellido: "Pérez",
  correo: "ana@example.com",
  tituloEvaluacion: "Redes",
  tipoEvaluacion: "evaluacion",
  duracionMinutos: 60,
};

describe("RevisionAlumnoPage", () => {
  it("no presenta como incorrecta una opción cuya clave no fue expuesta", async () => {
    useAttemptMock.mockReturnValue({
      data: {
        ...attempt,
        preguntas: [{
          idPregunta: 20,
          enunciado: "Elegí protocolos",
          tipo: "multiple",
          grupoConceptualmente: "TCP/IP",
          puntajeMaximo: 1,
          puntajeObtenido: 0.75,
          origenCorreccion: "automatica",
          comentariosDocente: null,
          corregidoPor: null,
          fechaCorreccion: "2026-10-12T13:00:00.000Z",
          respuesta: null,
          opciones: [
            { idOpcion: 1, texto: "TCP", fueSeleccionada: true },
            { idOpcion: 2, texto: "UDP", fueSeleccionada: false },
          ],
        }],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useGetIntentoCompleto>);

    await act(async () => {
      render(<RevisionAlumnoPage params={Promise.resolve({ idIntento: "73" })} />);
    });

    expect(screen.getByText("Tu elección")).toBeVisible();
    expect(screen.getByText(/Pregunta corregida: 0.75 de 1 puntos/)).toBeVisible();
    expect(screen.queryByText(/incorrecta/i)).not.toBeInTheDocument();
  });

  it("deriva el estado de una respuesta abierta desde su puntaje", async () => {
    useAttemptMock.mockReturnValue({
      data: {
        ...attempt,
        preguntas: [{
          idPregunta: 21,
          enunciado: "Explicá el modelo",
          tipo: "abierta",
          grupoConceptualmente: "Modelo",
          puntajeMaximo: 2,
          puntajeObtenido: 1.5,
          origenCorreccion: "manual",
          comentariosDocente: "Buen desarrollo.",
          corregidoPor: 10,
          fechaCorreccion: "2026-10-12T13:00:00.000Z",
          respuesta: {
            idRespuesta: 90,
            rtaTexto: "Mi explicación",
            esCorrecta: null,
          },
          opciones: [],
        }],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useGetIntentoCompleto>);

    await act(async () => {
      render(<RevisionAlumnoPage params={Promise.resolve({ idIntento: "73" })} />);
    });

    expect(screen.getByText(/Corregida · 1.50 de 2 puntos/)).toBeVisible();
    expect(screen.queryByText(/Pendiente de corrección manual/)).not.toBeInTheDocument();
  });
});
