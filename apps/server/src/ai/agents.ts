import { generateObject } from "ai";
import {
  AnalysisSchema,
  EmailSummariesSchema,
  InvoiceAgentOutputSchema,
} from "./schemas";
import { handleGenObject, handleNoObjectError } from "../utils/ai-utils";
import {
  FinancialAgentSystemPrompt,
  InvoiceAgentSystemPrompt,
  SummariserAgentSystemPrompt,
} from "./prompts";

export const FinancialAgent = async (prompt: string, model: string) => {
  const res = await handleGenObject({
    model,
    prompt,
    schema: AnalysisSchema,
    system: FinancialAgentSystemPrompt,
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
