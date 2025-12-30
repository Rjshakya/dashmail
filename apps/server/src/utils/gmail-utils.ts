import { gmail_v1 } from "@googleapis/gmail";
import { env } from "cloudflare:workers";
import PostalMime from "postal-mime";
import * as cheerio from "cheerio";
import { IparsedMessage } from "../do/thread.do";
import { GmailManager } from "../services/gmailManager";

export const getAccessToken = async (
  refreshToken: string,
  clientId?: string,
  clientSecret?: string
) => {
  try {
    const body = {
      client_id: clientId ?? env.GOOGLE_CLIENT_ID,
      client_secret: clientSecret ?? env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    };

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
    });

    if (!res.ok) {
      throw new Error("failed to refresh token" + res.status);
    }

    const data = (await res.json()) as any;
    return {
      accessToken: data?.access_token as string,
      refreshToken: refreshToken as string,
    };
  } catch (e) {
    throw new Error("failed to refresh token" + e);
  }
};

export const processGmailRawMessage = async (raw: string) => {
  try {
    const email = await PostalMime.parse(raw);
    return email;
  } catch (e) {
    console.log("Error in processGmailMessage:", e);
    throw new Error("failed to processGmailMessage" + e);
  }
};

export const processGmailMessage = async (
  message: gmail_v1.Schema$Message,
  gmailClient: GmailManager,
  userId: string | undefined
): Promise<IparsedMessage | undefined> => {
  const processMessageParts = (
    parts: gmail_v1.Schema$MessagePart[] | undefined
  ) => {
    if (!parts || parts.length === 0) return;

    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body && part.body.data) {
        const decoded = Buffer.from(part.body.data, "base64url").toString();
        return decoded.trim().replace(/\s+/g, " ");
      }

      if (part.mimeType === "text/html" && part.body && part.body.data) {
        const decoded = Buffer.from(part.body.data, "base64url").toString();
        const $ = cheerio.load(decoded);
        return $("body").text().trim().replace(/\s+/g, " ");
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
        if (!part.body?.attachmentId) continue;

        const attachment = await gmailClient.getAttachment(
          messageId,
          part.body.attachmentId
        );

        const fileDate = attachment.data;
        if (attachment.size && attachment.size > 5 * 1024 * 1024) {
          console.log(
            "Attachment size exceeds 5MB, skipping download for:",
            part.filename
          );
          continue;
        }
        const fileBuffer = fileDate ? Buffer.from(fileDate, "base64") : null;
        const key = `${userId}/attachments/${message.threadId}/${message.id}/${part.filename}`;

        const result = await env.DASHMAILBUCKET.put(key, fileBuffer, {
          customMetadata: {
            userId: userId || "dashMail",
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
      console.error("failed to process-attachments");
    }
  };

  try {
    if (!message.payload || !message.payload.headers) return;

    const subject = message.payload.headers.find(
      (h) => h.name === "Subject"
    )?.value;
    const from = message.payload.headers.find((h) => h.name === "From")?.value;
    const to = message.payload.headers.find((h) => h.name === "To")?.value;
    const date = message.payload.headers.find((h) => h.name === "Date")?.value;

    const attachments = (message.payload.parts || [])?.filter(
      (p) => p.filename && p.body?.attachmentId
    );

    const body =
      message.payload.parts &&
      message.payload.parts.length > 0 &&
      processMessageParts(message.payload.parts);

    let attachmentUrls: string[] = [];
    if (attachments && attachments.length > 0) {
      attachmentUrls =
        (await processAttachments(attachments, message.id || "")) ?? [];
      console.log("Attachment URLs:", attachmentUrls);
    }

    return {
      subject,
      from,
      to,
      threadId: message.threadId,
      date,
      attachments: attachmentUrls,
      text: body || "",
      labels: message.labelIds,
      messageId: message.id,
    };
  } catch (e) {
    throw new Error("failed to process-message");
  }
};
