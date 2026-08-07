import { FeedbackMessage } from "./FeedbackMessage";

export const ErrorMessage = ({ message }: { message: string }) => (
  <FeedbackMessage variant="error" message={message} />
);
