import { AnalysisSchema } from "./schema";
import { handleGenObject } from "../../utils/ai-utils";
import { FinancialAgentSystemPrompt } from "./prompt";

export const FinancialAgent = async (prompt: string, model: string) => {

  

  const res = await handleGenObject({
    model,
    prompt,
    schema: AnalysisSchema,
    system: FinancialAgentSystemPrompt,
  });
  return res;
};
