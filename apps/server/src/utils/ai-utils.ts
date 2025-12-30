import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { NoObjectGeneratedError, APICallError, TypeValidationError, generateObject } from "ai";
import { env } from "cloudflare:workers";
import { z } from "zod/v3";
import { createFallback } from "ai-fallback";
import { createAiGateway } from "ai-gateway-provider";
import { createXai } from "@ai-sdk/xai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

interface Igen<T> {
  prompt: string;
  model: string;
  schema: z.ZodSchema<T>;
  system?: string;
}

export const getOpenRouter = () =>
  createOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
  });

export const handleGenObject = async <T>(params: Igen<T>) => {
  try {
    const { model, prompt, schema, system } = params;

    // const aiGateway = createAiGateway({
    //   gateway: "dash-mail-gateway",
    //   accountId: env.CF_ACC_ID,
    //   apiKey: env.CF_AI_GATEWAY_TOKEN,
    // });

    const { object } = await generateObject({
      model: createModelWithFallback(model),
      schema,
      prompt,
      system,
    });

    return object;
  } catch (e) {
    handleNoObjectError(e);
  }
};

export const handleNoObjectError = (error: unknown) => {
  if (NoObjectGeneratedError.isInstance(error)) {
    console.error("[NoObjectGeneratedError]: Cause:", error.cause);
    console.error("[NoObjectGeneratedError]: Usage:", error.usage);
    return;
  }

  if (APICallError.isInstance(error)) {
    console.error("[APICallError]: Cause:", error.cause);
    console.error("[APICallError]: Status:", error.statusCode);
    console.error("[APICallError]: message:", error.message);
    console.error("[APICallError]: data:", error.data);
    console.error("[APICallError]: body:", error.requestBodyValues);
    return;
  }

  if (TypeValidationError.isInstance(error)) {
    console.error("[TypeValidationError]: Cause:", error.cause);
    console.error("[TypeValidationError]: value:", error.value);
    console.error("[TypeValidationError]: message:", error.message);
    return;
  }

  throw error;
};

export const createModelWithFallback = (primaryModel: string) => {
  const openrouter = getOpenRouter();
  const model = createFallback({
    models: [openrouter.chat(primaryModel), openrouter.chat("x-ai/grok-4-fast")],
  });

  return model;
};
