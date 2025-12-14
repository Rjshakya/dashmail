import { env, WorkflowEntrypoint } from "cloudflare:workers";
import { createDB } from "../db/config";
import { eq, sql } from "drizzle-orm";
import { account } from "../db/schema/auth-schema";
import { getAccessToken } from "../utils/google";
import { gmail, gmail_v1 } from "@googleapis/gmail";
import { OAuth2Client } from "google-auth-library";
import { threadId } from "worker_threads";

export interface IGetAndWatchInboxMails {
  userId: string;
}

export interface IProcessedMessage {
  subject: string | null | undefined;
  from: string | null | undefined;
  to: string | null | undefined;
  body: string;
  attachmentUrls: string[];
  threadId: string | null | undefined;
  snippet: string | null | undefined;
  date: string | null | undefined;
  internalDate: Date | null;
}

export const processMessage = async (
  message: gmail_v1.Schema$Message,
  gmailClient: gmail_v1.Gmail,
  userId: string
) => {
  const processMessageParts = (
    parts: gmail_v1.Schema$MessagePart[] | undefined
  ) => {
    if (!parts || parts.length === 0) return;
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body && part.body.data) {
        return part.body.data;
      }

      if (part.mimeType === "text/html" && part.body && part.body.data) {
        return part.body.data;
      }

      if (part.parts && part.parts.length > 0) {
        return processMessageParts(part.parts);
      }
    }
  };

  const processAttachments = async (
    parts: gmail_v1.Schema$MessagePart[] | undefined,
    messageId: string
  ) => {
    try {
      if (!parts || parts.length === 0) return [];
      let attachmentUrls: string[] = [];

      for (const part of parts) {
        const attachment = await gmailClient.users.messages.attachments.get({
          userId: "me",
          messageId,
          id: part.body?.attachmentId || "",
        });

        const fileDate = attachment.data.data;
        if (attachment.data.size && attachment.data.size > 50 * 1024 * 1024) {
          console.log(
            "Attachment size exceeds 50MB, skipping download for:",
            part.filename
          );
          continue;
        }
        const fileBuffer = fileDate ? Buffer.from(fileDate, "base64") : null;
        const key = `${userId}attachments/${message.threadId}/${message.id}/${part.filename}`;
        const result = await env.DASHMAILBUCKET.put(key, fileBuffer, {
          customMetadata: {
            userId,
            messageId: message.id || "",
            filename: part.filename || "",
          },
        });
        let r2_url =
          env.NODE_ENV === "production" ? env.R2_PROD_URL : env.R2_DEV_URL;
        attachmentUrls.push(r2_url + "/" + result.key);
      }
      return attachmentUrls;
    } catch (e) {
      throw new Error("failed to process-attachments");
    }
  };

  try {
    if (!message.payload || !message.payload.headers) return;

    const subject = message.payload.headers.find(
      (h) => h.name === "Subject"
    )?.value;

    const from = message.payload.headers.find((h) => h.name === "From")?.value;

    const to = message.payload.headers.find((h) => h.name === "To")?.value;

    const snippet = message.snippet;
    const date = message.payload.headers.find((h) => h.name === "Date")?.value;
    const internalDate = message.internalDate
      ? new Date(parseInt(message.internalDate))
      : null;

    const attachments = (message.payload.parts || [])?.filter(
      (p) => p.filename && p.body?.attachmentId
    );

    const body =
      message.payload.parts &&
      message.payload.parts.length > 0 &&
      processMessageParts(message.payload.parts);

    let text = "";

    if (body) {
      text = Buffer.from(body, "base64").toString("utf-8");
    }

    let attachmentUrls: string[] = [];
    if (attachments && attachments.length > 0) {
      attachmentUrls = await processAttachments(attachments, message.id || "");
      console.log("Attachment URLs:", attachmentUrls);
    }

    return {
      subject,
      from,
      to,
      body: text,
      attachmentUrls,
      threadId: message.threadId,
      snippet,
      date,
      internalDate,
    } satisfies IProcessedMessage;
  } catch (e) {
    throw new Error("failed to process-message");
  }
};

export class SyncAndWatchInboxMailsFlow extends WorkflowEntrypoint {
  async run(
    event: Readonly<
      CloudflareWorkersModule.WorkflowEvent<IGetAndWatchInboxMails>
    >,
    step: CloudflareWorkersModule.WorkflowStep
  ) {
    const { userId } = event.payload;

    const userCredentianls = await step.do("get-user-details", async () => {
      try {
        const db = await createDB(env.HYPERDRIVE.connectionString);
        const [user] = await db
          .select({
            refreshToken: account.refreshToken,
            userId: account.userId,
          })
          .from(account)
          .where(eq(account.userId, userId));

        return user;
      } catch (e) {
        throw new Error("failed get-user-details");
      }
    });

    const tokens = await step.do("get-tokens", async () => {
      try {
        if (!userCredentianls.refreshToken) return;
        const tokens = await getAccessToken(userCredentianls.refreshToken);
        return tokens;
      } catch (e) {
        throw new Error("failed get-tokens");
      }
    });

    const watchMails = await step.do("set-watch-mails", async () => {
      try {
        if (!tokens) return;

        const oauthClient = new OAuth2Client();
        oauthClient.setCredentials({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });

        const gmailClient = gmail("v1");
        const res = await gmailClient.users.watch({
          userId: "me",
          auth: oauthClient,
          requestBody: {
            labelIds: ["INBOX", "UNREAD"],
            topicName: env.GOOGLE_PUB_TOPIC,
          },
        });

        if (!res.ok) throw new Error("failed to set-watch-mails");

        return res.data.historyId;
      } catch (e) {
        console.log("Error in set-watch-mails:", e);
        throw new Error("failed to set-watch-mails");
      }
    });

    const getMailThreads = await step.do("get-mail-threads", async () => {
      try {
        const auth = new OAuth2Client();
        auth.setCredentials({
          access_token: tokens?.accessToken,
          refresh_token: tokens?.refreshToken,
        });

        const gmailClient = gmail("v1");
        const res = await gmailClient.users.threads.list({
          userId: "me",
          auth,
          labelIds: ["INBOX"],
          maxResults: 30,
        });

        return res.data.threads;
      } catch (e) {
        console.log("Error in get-mail-threads:", e);
        throw new Error("failed to get-mail-threads");
      }
    });

    const processThreads = await step.do("process-mails", async () => {
      try {
        console.log("mail-threads:length:", getMailThreads?.length);

        if (!getMailThreads || getMailThreads?.length === 0) return;

        const auth = new OAuth2Client();
        auth.setCredentials({
          access_token: tokens?.accessToken,
          refresh_token: tokens?.refreshToken,
        });

        const gmailClient = gmail("v1");
        const promises = getMailThreads
          .filter((thread) => thread.id)
          .map((thread) => {
            return gmailClient.users.threads.get({
              userId: "me",
              id: thread.id as string,
              auth,
              format: "full",
            });
          });

        const threadDetails = await Promise.all(promises);
        return threadDetails.map((td) => td.data);
      } catch (e) {
        console.log("Error in process-mails:", e);
        throw new Error("failed to process-mails");
      }
    });

    const processMessages = await step.do("process-messages", async () => {
      try {
        console.log("process-threads:length:", processThreads?.length);
        if (!processThreads) return;

        const processedMessages: IProcessedMessage[] = [];
        const auth = new OAuth2Client();
        auth.setCredentials({
          access_token: tokens?.accessToken,
          refresh_token: tokens?.refreshToken,
        });

        const gmailClient = gmail("v1");

        for (const threads of processThreads) {
          const messages = threads.messages;

          if (!messages) continue;

          for (const message of messages) {
            console.log("thread message id:", message.id);
            console.log("thread message snippet:", message.snippet);

            if (!message.payload || !message.payload.headers) continue;

            const processedMessage = await processMessage(
              message,
              gmailClient,
              userId
            );

            if (processedMessage) {
              processedMessages.push(processedMessage);
            }
          }
        }

        console.log(
          "Total messages processed:",
          JSON.stringify(processedMessages, null, 2)
        );
        return processedMessages;
      } catch (e) {
        console.log("Error in process-messages:", e);
        throw new Error("failed to process-messages");
      }
    });

  }
}
