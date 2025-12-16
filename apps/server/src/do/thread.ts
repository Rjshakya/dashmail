/**
 * run durable object for each mail thread
 */

import { DurableObject } from "cloudflare:workers";
import { GmailManager, IGmailManagerConfig } from "../services/gmailManager";
import { gmail, gmail_v1 } from "@googleapis/gmail";
import { OAuth2Client } from "google-auth-library";
import { Agent, AgentContext } from "agents";
import { execAsync } from "../utils/general";
import { processGmailRawMessage } from "../utils/gmail-utils";
import { Email } from "postal-mime";
import { orchestrateAiFlow } from "./dash-mail-ai";
import { pruneMessages } from "ai";
import { SummariseThreadsAgent } from "../ai/agents";
import { EmailSummaries } from "../ai/schemas";

export type IparsedMessage = Email & {
  threadId: string | null | undefined;
  snippet: string | null | undefined;
  labels: string[] | null | undefined;
};

export class MailThreadDO extends Agent {
  async run(config: IGmailManagerConfig, userId: string, threadsIds: string[]) {
    return execAsync("run-MailThreadDO", async () => {
      // await this.setConfig(userId, config);

      const threads = await this.serializeThreadsForLLM(threadsIds, config);
      if (!threads || threads.length < 5) return;

      const summaries = await SummariseThreadsAgent(
        threads,
        "x-ai/grok-4.1-fast"
      );

      if (summaries) {
        console.log(summaries);
        await this.putThreadBatchAISummary(userId, summaries);
      }
    });
  }

  async serializeThreadsForLLM(
    threadIds: string[],
    config: IGmailManagerConfig
  ) {
    return execAsync("getThreadsOfParsedMsg", async () => {
      const promises = threadIds
        .filter(Boolean)
        .map((th) => this.getThreadOfParsedMsg(th as string, config));

      const threadsWithMessages = await Promise.all(promises);
      const llmFormatThreadsWithMessages = threadsWithMessages
        .filter(Boolean)
        .map((th) => {
          if (!th) return `No thread N/A`;
          return JSON.stringify({
            threadId: th?.[0].threadId,
            messages: th.map((m) => {
              if (!m) return `No message N/A`;
              return this.parsedMessageInLLMformat(m);
            }),
          });
        })
        .join(" --- separator ---- ");

      return llmFormatThreadsWithMessages;
    });
  }

  async getThreadOfParsedMsg(id: string, config: IGmailManagerConfig) {
    return execAsync("getThreadOfParsedMsg", async () => {
      // get thread messages
      const threadMessages = await this.getThreadMessages(id, config);
      if (
        !threadMessages ||
        !threadMessages.messages ||
        !threadMessages.messages.length
      ) {
        console.info(`[MailThreadDO]:${id} no threadMessages found`);
        return;
      }

      // message in thread , doesn't include raw content
      // that's why calling gmail api for each message to get message.
      // get raw message of messages.

      const promises = threadMessages.messages
        .filter((m) => m && m.id)
        .map((m) => {
          return this.getMessage(m.id as string, config);
        });

      const messages = await Promise.all(promises);
      if (!messages || !messages.length) return;

      const parsedMessagesPromises = messages.map((m) => this.parseMessage(m));
      const parsedMessages = await Promise.all(parsedMessagesPromises);
      return parsedMessages;
    });
  }

  async getThreadMessages(id: string, config: IGmailManagerConfig) {
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

  async getMessage(msgId: string, config: IGmailManagerConfig) {
    return execAsync("getMessage", async () => {
      const client = this.getGmailClient(config);
      const message = await client.getMessage(msgId, "raw");
      return message;
    });
  }

  async parseMessage(msg: gmail_v1.Schema$Message) {
    return await execAsync("parseMessage", async () => {
      const raw = msg?.raw as string;
      const decoded = Buffer.from(raw, "base64url").toString();
      const email = await processGmailRawMessage(decoded);
      return {
        ...email,
        snippet: msg.snippet,
        threadId: msg.threadId,
        labels: msg.labelIds,
        messageId: msg.id as string,
      } satisfies IparsedMessage;
    });
  }

  parsedMessageInLLMformat(msg: IparsedMessage) {
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
    const emailBody = safeString(msg.text); // The full email body

    return `
              # Message
              ---
              - **ID:** ${emailId}
              - **Thread ID:** ${safeString(msg.threadId)}
              - **Subject:** ${emailSubject}
              - **Date:** ${emailDate}
              - **Labels:** [${formatLabels(msg.labels)}]

              ## Snippet (Summary)
              > ${safeString(msg.snippet)}

              ## Full Body Content
              \`\`\`text
              ${emailBody}
              \`\`\`
  `.trim();
  }

  async getThreadBatchAISummary(key: string) {
    const _key = key + ":summaries";
    return await this.ctx.storage.get<EmailSummaries>(_key);
  }

  async putThreadBatchAISummary(key: string, summaries: EmailSummaries) {
    const _key = key + ":summaries";
    await this.ctx.storage.put(_key, summaries);
  }

  async getThreadAiReport(threadId: string) {
    const key = `${threadId}:reports`;
    return await this.ctx.storage.get<any>(key);
  }

  async putThreadAiReport(threadId: string, data: any) {
    const key = `${threadId}:reports`;
    await this.ctx.storage.put(key, data);
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
