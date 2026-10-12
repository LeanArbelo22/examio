import { notFound } from "next/navigation";
import { QuestionBankQuestionEditor } from "@/components/question-bank/QuestionBankQuestionEditor";

export default async function EditQuestionBankQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const questionId = Number(id);
  if (!Number.isInteger(questionId) || questionId <= 0) notFound();
  return <QuestionBankQuestionEditor questionId={questionId} />;
}
