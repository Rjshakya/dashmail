import { AnalysisSchema } from "../finance/schema";
import { handleGenObject } from "../../utils/ai-utils";
import { FinalMessageSchema } from "./schema";
import { FinalMessageSystemPrompt } from "./prompt";

export const AggregatorAgent = async (prompt: string, model: string) => {
  const res = await handleGenObject({
    model,
    prompt,
    schema: FinalMessageSchema,
    system: FinalMessageSystemPrompt,
  });
  return res;
};
