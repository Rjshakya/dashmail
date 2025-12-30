import { EmailSummariesSchema } from "../summary/schema";
import { handleGenObject } from "../../utils/ai-utils";
import { SummariserAgentSystemPrompt } from "../summary/prompt";

export const SummariseThreadsAgent = async (prompt: string, model: string) => {
  const res = await handleGenObject({
    prompt,
    model,
    schema: EmailSummariesSchema,
    system: SummariserAgentSystemPrompt,
  });
  return res;
};
