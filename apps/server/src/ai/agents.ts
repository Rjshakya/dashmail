import { generateObject } from "ai";
import { getOpenRouter } from "../do/dash-mail-ai";
import { EmailSummariesSchema, InvoiceAgentOutputSchema } from "./schemas";
import { handleGenObject, handleNoObjectError } from "../utils/ai-utils";
import {
  InvoiceAgentSystemPrompt,
  SummariserAgentSystemPrompt,
} from "./prompts";

export const InvoiceAgent = async (prompt: string, model: string) => {
  const res = await handleGenObject({
    model,
    prompt,
    schema: InvoiceAgentOutputSchema,
    system: InvoiceAgentSystemPrompt,
  });
  return res;
};

export const SummariseThreadsAgent = async (prompt: string, model: string) => {
  const res = await handleGenObject({
    prompt,
    model,
    schema: EmailSummariesSchema,
    system: SummariserAgentSystemPrompt,
  });
  return res;
};
