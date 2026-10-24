import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComparativaCarrera, ResultadosOficiales } from "@/types";
import { InstitutionalComparisonChart, InstitutionalMonthlyChart } from "./InstitutionalAnalyticsCharts";

const official = (overrides: Partial<ResultadosOficiales> = {}): ResultadosOficiales => ({
  intentosValidosEntregados: 20,
  resultadosConsiderados: 16,
  resultadosPendientes: 4,
  intentosPendientesConfirmacion: 4,
  intentosConfirmadosSinNota: 0,
  intentosConPreguntasSinPuntaje: 1,
  preguntasSinPuntaje: 1,
  aprobados: 8,
  desaprobados: 8,
  porcentajeAprobacion: 50,
  porcentajeCoberturaConfirmada: 80,
  ...overrides,
});

const item: ComparativaCarrera & { posicion: number } = {
  idCarrera: 7,
  carrera: "Tecnicatura Superior en Ciberseguridad y Redes",
  posicion: 1,
  publicaciones: 3,
  publicacionesConResultadosPendientes: 1,
  publicacionesConPendientesOperativos: 1,
  resultadosOficiales: official(),
  pendientesOperativos: {
    intentosEntregadosPendientes: 4,
    intentosPendientesConfirmacion: 4,
    intentosSinNotaFinal: 2,
    intentosConPreguntasSinPuntaje: 1,
    preguntasSinPuntaje: 1,
  },
};

describe("gráficos institucionales", () => {
  it("ofrece una alternativa textual navegable con numerador, pendientes y cobertura", () => {
    const onSelect = vi.fn();
    render(<InstitutionalComparisonChart title="Comparación entre carreras" description="Descripción" items={[item]} onSelect={onSelect} />);
    const row = screen.getByRole("button", { name: /Tecnicatura Superior en Ciberseguridad y Redes/ });
    expect(row).toHaveTextContent("8 aprobados de 16 resultados");
    expect(row).toHaveTextContent("4 pendientes");
    expect(row).toHaveTextContent("80% confirmados");
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(item);
  });

  it("diferencia aprobación cero, ausencia de observación y meses parciales", () => {
    render(<InstitutionalMonthlyChart points={[
      { periodo: "2026-09", periodoCompleto: true, publicaciones: 1, publicacionesConResultadosPendientes: 0, resultadosOficiales: official({ aprobados: 0, porcentajeAprobacion: 0 }) },
      { periodo: "2026-10", periodoCompleto: false, publicaciones: 0, publicacionesConResultadosPendientes: 0, resultadosOficiales: official({ intentosValidosEntregados: 0, resultadosConsiderados: 0, resultadosPendientes: 0, aprobados: 0, desaprobados: 0, porcentajeAprobacion: null, porcentajeCoberturaConfirmada: null }) },
    ]} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getAllByText("Sin resultados confirmados").length).toBeGreaterThan(0);
    expect(screen.getByText(/oct 26 · parcial/i)).toBeInTheDocument();
  });
});
