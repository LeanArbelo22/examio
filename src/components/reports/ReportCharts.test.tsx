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
      />,
    );

    expect(screen.getByText("Aprobados: 12")).toBeInTheDocument();
    expect(screen.getByText("Pendientes de corrección: 3")).toBeInTheDocument();
  });
});
