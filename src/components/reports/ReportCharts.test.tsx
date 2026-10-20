import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvaluationReportCharts } from "./EvaluationReportCharts";
import { ReportCharts } from "./ReportCharts";

describe("alternativas accesibles de gráficos", () => {
  it("expone en texto los promedios y resultados visibles por alumno", () => {
    render(
      <ReportCharts
        alumnos={[
          {
            matricula: 30123,
            nombre: "Ada",
            apellido: "Lovelace",
            totalIntentos: 2,
            intentosAlcanceAcademico: 2,
            totalCorregidos: 2,
            promedio: 9,
            escalaPromedio: 10,
            alcanceIntentos: "todos",
            aprobados: 2,
            desaprobados: 0,
            porcentajeAprobacion: 100,
          },
        ]}
      />,
    );

    expect(screen.getByText("A. Lovelace: promedio 9.00")).toBeInTheDocument();
    expect(screen.getByText("Aprobados: 2. Desaprobados: 0.")).toBeInTheDocument();
  });

  it("expone en texto la distribución global de evaluaciones", () => {
    render(
      <EvaluationReportCharts
        distribution={[
          { categoria: "Aprobados", cantidad: 12 },
          { categoria: "Pendientes de corrección", cantidad: 3 },
        ]}
        participation={{ alcanzados: 20, iniciaron: 18, entregaron: 16 }}
      />,
    );

    expect(screen.getByText("Aprobados: 12")).toBeInTheDocument();
    expect(screen.getByText("Pendientes de corrección: 3")).toBeInTheDocument();
    expect(screen.getByText("Estudiantes alcanzados")).toBeInTheDocument();
    expect(screen.getByText("Iniciaron")).toBeInTheDocument();
    expect(screen.getByText("Entregaron")).toBeInTheDocument();
  });

  it("compara participación y resultados entre las evaluaciones visibles", () => {
    render(
      <EvaluationReportCharts
        distribution={[]}
        comparisons={[
          {
            titulo: "Primer parcial",
            materia: "Programación",
            division: "1A",
            alumnosAlcanzados: 20,
            alumnosQueIniciaron: 18,
            entregados: 16,
            resultadosOficiales: {
              aprobados: 10,
              desaprobados: 4,
              resultadosPendientes: 2,
            },
          } as never,
        ]}
      />,
    );

    expect(screen.getByText("Participación por evaluación")).toBeInTheDocument();
    expect(screen.getByText("Resultados por evaluación")).toBeInTheDocument();
    expect(
      screen.getByText(/20 alcanzados, 18 iniciaron y 16 entregaron/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/10 aprobados, 4 desaprobados y 2 pendientes/),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        (_, element) =>
          element?.tagName === "LI" &&
          Boolean(element.textContent?.includes("Primer parcial · Programación · 1A")),
      ),
    ).not.toHaveLength(0);
  });
});
