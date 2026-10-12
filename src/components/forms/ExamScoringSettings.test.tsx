import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExamScoringSettings } from "./ExamScoringSettings";

describe("ExamScoringSettings", () => {
  it("notifica la escala elegida y resume los puntajes personalizados", async () => {
    const user = userEvent.setup();
    const onScaleChange = vi.fn();
    render(
      <ExamScoringSettings
        scale={10}
        passingGrade="4"
        scoreMode="personalizados"
        showScoreToStudent={false}
        autoGradeClosedQuestions
        groupScores={["3.34", "3.33", "3.33"]}
        errors={{}}
        scaleChangeNotice="Los valores se ajustaron proporcionalmente."
        onScaleChange={onScaleChange}
        onPassingGradeChange={vi.fn()}
        onScoreModeChange={vi.fn()}
        onShowScoreToStudentChange={vi.fn()}
        onAutoGradeClosedQuestionsChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Los valores se ajustaron proporcionalmente.",
    );
    expect(screen.getByText(/Puntaje asignado: 10\.00 de 10\.00/)).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Escala de calificación"), "100");
    expect(onScaleChange).toHaveBeenCalledWith(100);
  });
});
