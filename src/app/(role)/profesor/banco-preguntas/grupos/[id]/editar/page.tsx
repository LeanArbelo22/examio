import { notFound } from "next/navigation";
import { QuestionBankGroupEditor } from "@/components/question-bank/QuestionBankGroupEditor";

export default async function EditQuestionBankGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isInteger(groupId) || groupId <= 0) notFound();
  return <QuestionBankGroupEditor groupId={groupId} />;
}
