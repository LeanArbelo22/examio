import type { z } from "zod";

export function validationErrorsFromZod(
  issues: z.core.$ZodIssue[],
): Record<string, string> {
  return issues.reduce<Record<string, string>>((errors, issue) => {
    const path = issue.path.join(".");
    if (path && !errors[path]) errors[path] = issue.message;
    return errors;
  }, {});
}
