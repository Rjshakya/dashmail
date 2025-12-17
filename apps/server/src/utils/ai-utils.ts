import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, NoObjectGeneratedError } from "ai";
import { env } from "cloudflare:workers";
import type { z } from "zod";

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
    const openrouter = getOpenRouter();
    const { object } = await generateObject({
      model: openrouter.chat(model),
      schema,
      prompt: [{ role: "user", content: prompt }],
      system,
    });

    return object;
  } catch (e) {
    handleNoObjectError(e);
  }
};

export const handleNoObjectError = (error: unknown) => {
  if (NoObjectGeneratedError.isInstance(error)) {
    console.log("Cause:", error.cause);
    console.log("Usage:", error.usage);
  } else {
    throw error;
  }
};
