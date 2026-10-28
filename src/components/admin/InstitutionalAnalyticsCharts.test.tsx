import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComparativaCarrera, PuntoSerieTemporalInstitucional, ResultadosOficiales } from "@/types";
import { InstitutionalRankingView, InstitutionalTemporalChart } from "./InstitutionalAnalyticsCharts";

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
  promedioNotaBase10: 6.25,
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
  pendientesOperativos: { intentosEntregadosPendientes: 4, intentosPendientesConfirmacion: 4, intentosSinNotaFinal: 2, intentosConPreguntasSinPuntaje: 1, preguntasSinPuntaje: 1 },
};

function point(periodo: string, etiqueta: string, complete: boolean, values: Partial<ResultadosOficiales>): PuntoSerieTemporalInstitucional {
  return {
    periodo,
    etiqueta,
    limitesCalendario: { desde: "2026-01-01T03:00:00.000Z", hastaExclusivo: "2026-02-01T03:00:00.000Z" },
    limitesEfectivos: { desde: "2026-01-01T03:00:00.000Z", hasta: "2026-01-31T23:59:59.999Z" },
    periodoCompleto: complete,
    publicaciones: 1,
    publicacionesConResultadosPendientes: 0,
    resultadosOficiales: official(values),
  };
}

function emptyPoint(periodo: string, etiqueta: string): PuntoSerieTemporalInstitucional {
  return {
    ...point(periodo, etiqueta, true, {
      intentosValidosEntregados: 0,
      resultadosConsiderados: 0,
      resultadosPendientes: 0,
      aprobados: 0,
      desaprobados: 0,
      porcentajeAprobacion: null,
      porcentajeCoberturaConfirmada: null,
      promedioNotaBase10: null,
    }),
    publicaciones: 0,
  };
}

describe("presentación institucional v1.4", () => {
  it("muestra posición, muestra, pendientes y cobertura y permite navegar", () => {
    const onSelect = vi.fn();
    render(<InstitutionalRankingView items={[item]} totalAvailable={1} requestedLabel="5" onSelect={onSelect} />);
    const row = screen.getByRole("button", { name: /Tecnicatura Superior/ });
    expect(row).toHaveTextContent("8/16 aprobados");
    expect(row).toHaveTextContent("promedio 6,25 sobre 10 (16 resultados)");
    expect(row).toHaveTextContent("4 pendientes");
    expect(row).toHaveTextContent("80% confirmados");
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(item);
  });

  it("informa cuántas entidades hay cuando se piden más de las disponibles", () => {
    render(<InstitutionalRankingView items={[item]} totalAvailable={1} requestedLabel="20" onSelect={vi.fn()} />);
    expect(screen.getByText("Mostrando 1 de 1 disponibles · selección: 20")).toBeInTheDocument();
  });

  it("muestra promedio y muestra en la tabla de comparaciones extensas", () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      ...item,
      idCarrera: index + 1,
      carrera: `Carrera ${index + 1}`,
      posicion: index + 1,
    }));
    render(<InstitutionalRankingView items={items} totalAvailable={11} requestedLabel="20" onSelect={vi.fn()} />);
    expect(screen.getByRole("columnheader", { name: "Promedio · sobre 10" })).toBeInTheDocument();
    expect(screen.getAllByText("6,25")).toHaveLength(11);
    expect(screen.getAllByText("16 resultados")).toHaveLength(11);
  });

  it("diferencia cero, ausencia de observación y período parcial en la alternativa textual", () => {
    render(<InstitutionalTemporalChart points={[
      point("2026-S1", "1.er semestre 2026", true, { aprobados: 0, porcentajeAprobacion: 0, promedioNotaBase10: 0 }),
      point("2026-S2", "2.º semestre 2026", false, { intentosValidosEntregados: 0, resultadosConsiderados: 0, resultadosPendientes: 0, aprobados: 0, desaprobados: 0, porcentajeAprobacion: null, porcentajeCoberturaConfirmada: null, promedioNotaBase10: null }),
    ]} selectedSeries={["approval", "average", "confirmed", "pending"]} />);
    fireEvent.click(screen.getByText("Ver datos de la evolución"));
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("0,00", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText("Sin resultados").length).toBeGreaterThan(0);
    expect(screen.getByText("2.º semestre 2026 · parcial")).toBeInTheDocument();
  });

  it("adapta la alternativa textual a la vista de aprobación sola", () => {
    render(<InstitutionalTemporalChart selectedSeries={["approval"]} points={[point("2026", "2026", true, {})]} />);
    fireEvent.click(screen.getByText("Ver datos de la evolución"));
    expect(screen.getByRole("columnheader", { name: "Aprobación" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Confirmados" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Pendientes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Promedio de notas · sobre 10" })).not.toBeInTheDocument();
  });

  it("muestra el promedio oficial con dos decimales y su muestra", () => {
    render(<InstitutionalTemporalChart selectedSeries={["average"]} points={[point("2026", "2026", true, { promedioNotaBase10: 6.5, resultadosConsiderados: 16 })]} />);
    fireEvent.click(screen.getByText("Ver datos de la evolución"));
    expect(screen.getByRole("columnheader", { name: "Promedio de notas · sobre 10" })).toBeInTheDocument();
    expect(screen.getByText("6,50", { exact: false })).toHaveTextContent("6,50 · 16 resultados");
  });

  it("oculta los períodos sin información del gráfico y de la alternativa textual", () => {
    render(<InstitutionalTemporalChart hideEmptyPeriods points={[
      point("2026-01", "enero de 2026", true, {}),
      emptyPoint("2026-02", "febrero de 2026"),
      point("2026-03", "marzo de 2026", true, {}),
    ]} />);
    fireEvent.click(screen.getByText("Ver datos de la evolución"));
    expect(screen.getByText("enero de 2026")).toBeInTheDocument();
    expect(screen.queryByText("febrero de 2026")).not.toBeInTheDocument();
    expect(screen.getByText("marzo de 2026")).toBeInTheDocument();
  });
});
