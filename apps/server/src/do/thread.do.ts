/**
 * run durable object for each mail thread
 */

import { GmailManager, IGmailManagerConfig } from "../services/gmailManager";
import { gmail, gmail_v1 } from "@googleapis/gmail";
import { Agent, AgentContext } from "agents";
import { execAsync } from "../utils/general";
import { processGmailMessage, processGmailRawMessage } from "../utils/gmail-utils";
import { SummariseThreadsAgent } from "../ai/summary/agent";
import { FinancialAgent } from "../ai/finance/agent";
import { AnalysisResult } from "../ai/finance/schema";
import { EmailSummaries } from "../ai/summary/schema";
import { openRouterModels } from "../utils/models";

export type IparsedMessage = {
  messageId: string | null | undefined;
  threadId: string | null | undefined;
  labels: string[] | null | undefined;
  from: string | null | undefined;
  to: string | null | undefined;
  subject: string | null | undefined;
  text: string | null | undefined;
  date: string | null | undefined;
  attachments: string[] | undefined;
};

export type RunResponse = {
  summaries: EmailSummaries;
  financialAnalysis: AnalysisResult;
};

export class Threads extends Agent {
  async run(
    config: IGmailManagerConfig,
    userId: string,
    threadsIds: string[],
  ): Promise<RunResponse | undefined> {
    return execAsync("run-MailThreadDO", async () => {
      this.ctx.storage.put("userId", userId);
      const threads = await this.serializeThreadsForLLM(threadsIds, config, userId);

      if (!threads || threads.length < 2) return;
      const promises = [
        SummariseThreadsAgent(threads, openRouterModels["grok4.1"]),
        FinancialAgent(threads, openRouterModels["grok4.1"]),
      ];

      const [summaries, financialAnalysis] = await Promise.all(promises);
      let res = {} as RunResponse;

      if (summaries && "summaries" in summaries) {
        await this.putThreadBatchSummary(userId, summaries);
        res.summaries = summaries;
      }

      if (financialAnalysis && "financialDocuments" in financialAnalysis) {
        await this.putThreadBatchFinancialAnalysis(userId, financialAnalysis);
        res.financialAnalysis = financialAnalysis;
      }

      return res;
    });
  }

  async serializeThreadsForLLM(threadIds: string[], config: IGmailManagerConfig, userId: string) {
    return execAsync("getThreadsOfParsedMsg", async () => {
      const promises = threadIds
        .filter(Boolean)
        .map((th) => this.getThreadWithParsedMsg(th as string, config, userId));

      const threadsWithParsedMessages = await Promise.all(promises);
      const threadsWithLLMformatMsg = threadsWithParsedMessages
        .filter((th) => th && th)
        .map((th) => {
          if (!th) return;
          if (!th.length) return;
          const threadId = th.find((th) => th && th?.threadId);

          return `
          <thread id="${threadId?.threadId}">
            <message>
           ${th
             ?.map((m) => {
               if (!m) return `No message N/A`;
               return `${this.parsedMessageForLLMformat(m)}`;
             })
             .join("")
             .trim()}]
             <message>
           <thread>  
          `
            .replace(/\n/g, " ")
            .trim();
        })
        .filter((th) => th && th.length > 0);

      console.log("filtered-threads", threadsWithLLMformatMsg.length);

      const llmFormatThreadsWithMessages = threadsWithLLMformatMsg.join("");
      return llmFormatThreadsWithMessages;
    });
  }

  async getThreadWithParsedMsg(id: string, config: IGmailManagerConfig, userId: string) {
    return execAsync("getThreadOfParsedMsg", async () => {
      // get thread messages
      const thread = await this.getThread(id, config);
      if (!thread || !thread.messages || !thread.messages.length) {
        console.info(`[MailThreadDO]:${id} no threadMessages found`);
        return;
      }

      // parse all the messages of threads
      const promises = thread.messages
        .filter((m) => m && m.id)
        .map((m) => {
          return this.getMessage(m, config, userId);
        });

      const messages = await Promise.all(promises);
      if (!messages || !messages.length) return;

      // filter common promo,marketing,newsletters,bot mails.
      const parsedMessages = messages.filter((m) => m && m);
      const marketingRegex =
        /(hello|no-reply|updates?|news(letter)?|offers?|sales|promo|welcome|substack|mailchimp|recommendations|info)/i;

      const financeRegex =
        /(invoice|bill|billing|statement|receipt|payment|Payment|transaction|tax-invoice|order)/i;

      return parsedMessages.filter((m) => {
        if (!m) return `No Message`;
        if (!m.from) return false;
        if (!m.subject) return false;

        if (m.from && financeRegex.test(m.subject)) return true;
        if (!marketingRegex.test(m.from)) return false;

        return true;
      });
    });
  }

  async getThread(id: string, config: IGmailManagerConfig) {
    return execAsync("getThreadMessages", async () => {
      if (!config) {
        console.warn("[getThreadMessages] no config found , returing");
        return;
      }

      const client = this.getGmailClient(config);
      const threads = await client.getThread(id);
      return threads;
    });
  }

  async getMessage(msg: gmail_v1.Schema$Message, config: IGmailManagerConfig, userId: string) {
    return execAsync("getMessage", async () => {
      const client = this.getGmailClient(config);
      const message = await processGmailMessage(msg, client, userId);
      return message;
    });
  }

  parsedMessageForLLMformat(msg: IparsedMessage) {
    const formatLabels = (labels: string[] | null | undefined): string => {
      return labels && labels.length > 0 ? labels.join(", ") : "None";
    };

    // Helper to safely handle null/undefined strings
    const safeString = (value: string | null | undefined): string => {
      return value ?? "N/A";
    };

    const emailId = safeString(msg.messageId);
    const emailSubject = safeString(msg.subject);
    const emailDate = safeString(msg.date);
    const attachments = safeString(msg?.attachments?.join(","));

    let emailBody = safeString(msg?.text?.slice(0, 90));
    const financeRegex =
      /(invoice|bill|billing|statement|receipt|payment|Payment|transaction|tax-invoice|order)/i;

    if (financeRegex.test(emailSubject)) {
      emailBody = safeString(msg?.text);
    }

    const finalMail = `
              ### Mail
              - **Message ID:** ${emailId.trim()},
              - **Thread ID:** ${safeString(msg.threadId).trim()},
              - **Subject:** ${emailSubject.trim()},
              - **Date:** ${emailDate.trim()},
              - **Labels:** [${formatLabels(msg.labels).trim()}],
              - **Body:** : ${emailBody.trim().replace(/\s+/g, " ")}`
      .replace(/\s+/g, " ")
      .trim();

    return finalMail;
  }

  async getThreadBatchSummary(userId: string) {
    const _key = userId + ":summaries";
    return await this.ctx.storage.get<EmailSummaries>(_key);
  }

  async putThreadBatchSummary(key: string, summaries: EmailSummaries) {
    const _key = key + ":summaries";
    await this.ctx.storage.put(_key, summaries);
  }

  async getThreadBatchFinancialAnalysis(userId: string) {
    const _key = userId + ":financials";
    return await this.ctx.storage.get<AnalysisResult>(_key);
  }

  async putThreadBatchFinancialAnalysis(key: string, financialAnalysis: AnalysisResult) {
    const _key = key + ":financials";
    await this.ctx.storage.put(_key, financialAnalysis);
  }

  getGmailClient(config: IGmailManagerConfig) {
    const client = new GmailManager(config);
    return client;
  }

  async getConfig(key: string) {
    const _key = `${key}:config`;
    return await this.ctx.storage.get<IGmailManagerConfig>(_key);
  }

  async setConfig(key: string, config: IGmailManagerConfig) {
    const _key = `${key}:config`;
    await this.ctx.storage.put<IGmailManagerConfig>(_key, config);
  }
}
