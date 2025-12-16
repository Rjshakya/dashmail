import { Agent, Connection, WSMessage } from "agents";
import { IparsedMessage } from "./thread";
import { generateObject, generateText, NoObjectGeneratedError } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "cloudflare:workers";
import { z } from "zod";
import {
  ACTIONANDECISIONEXTACTPROMPT,
  INVOICEPROCESSINGPROMPT,
  THREADANALYTICSPROMPT,
  THREADINTENTCLASSIFIER,
} from "../ai/prompts";
import {
  ClassificationSchema,
  InvoiceSchema,
  OperationalAnalyticsSchema,
  ThreadIntelligenceSchema,
} from "../ai/schemas";

export const orchestrateAiFlow = async (messages: string) => {
  try {
    const model = "openai/gpt-oss-120b";
    const prompt = messages;

    const object = await threadIntentChecker(prompt, "openai/gpt-oss-20b");
    if (!object) {
      return {
        shouldSkip: false,
      };
    }

    if (object && object.shouldSkipthisThread) {
      return {
        shouldSkip: true,
      };
    }

    const invoice = await genInvoiceReport(prompt, model);
    const actionAndDescisions = await genActionAndDecisionReport(prompt, model);
    const threadAnalytics = await genThreadAnalyticsReport(prompt, model);

    return {
      invoice,
      actionAndDescisions,
      threadAnalytics,
    };
  } catch (e) {
    console.error(e);
    throw new Error("orchestrateAiFlow" + e);
  }
};

export const getOpenRouter = () =>
  createOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
  });

export const genInvoiceReport = async (messages: string, MODEL: string) => {
  try {
    const openrouter = getOpenRouter();
    const { text } = await generateText({
      model: openrouter.chat(MODEL),
      // schema: InvoiceSchema,
      prompt: messages,
      system: INVOICEPROCESSINGPROMPT.trim(),
    });

    return text;
  } catch (e) {
    console.error("[generateInvoiceReport] error", e);
    throw new Error("[generateInvoiceReport] error");
  }
};

export const genActionAndDecisionReport = async (
  messages: string,
  MODEL: string
) => {
  try {
    const openrouter = getOpenRouter();
    const { text } = await generateText({
      model: openrouter.chat(MODEL),
      // schema: ThreadIntelligenceSchema,
      prompt: messages,
      system: ACTIONANDECISIONEXTACTPROMPT.trim(),
    });

    return text;
  } catch (e) {
    throw new Error("genActionAndDecisionReport");
  }
};

export const genThreadAnalyticsReport = async (
  messages: string,
  MODEL: string
) => {
  try {
    const openrouter = getOpenRouter();
    const { text } = await generateText({
      model: openrouter.chat(MODEL),
      // schema: OperationalAnalyticsSchema,
      prompt: messages,
      system: THREADANALYTICSPROMPT.trim(),
    });

    return text;
  } catch (e) {
    throw new Error("genThreadAnalyticsReport");
  }
};

export const threadIntentChecker = async (messages: string, model: string) => {
  try {
    const openrouter = getOpenRouter();
    const { object } = await generateObject({
      model: openrouter.chat(model),
      schema: ClassificationSchema,
      prompt: [
        {
          role: "user",
          content: "thread messages : " + messages.trim(),
        },
      ],
      system: THREADINTENTCLASSIFIER.trim(),
    });

    return object;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.log("NoObjectGeneratedError");
      console.log("Cause:", error.cause);
      console.log("Text:", error.text);
      console.log("Response:", error.response);
      console.log("Usage:", error.usage);
      console.log("Finish Reason:", error.finishReason);
    } else {
      throw error;
    }
  }
};
