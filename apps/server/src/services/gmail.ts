import { gmail_v1, gmail } from "@googleapis/gmail";
import { OAuth2Tokens } from "better-auth";
import { OAuth2Client } from "google-auth-library";
import { getAccessToken } from "../utils/google";

export interface IGmailManagerConfig {
  userId: string;
  authTokens: OAuth2Tokens;
}

export class GmailManager {
  gmailClient: gmail_v1.Gmail;
  auth: OAuth2Client;
  constructor(private config: IGmailManagerConfig) {
    this.auth = new OAuth2Client();

    if (!this.config.authTokens.refreshToken) {
      throw new Error("Missing refresh token");
    }

    this.auth.setCredentials({
      access_token: this.config.authTokens.accessToken,
      refresh_token: this.config.authTokens.refreshToken,
    });

    this.refreshAccessToken(this.config.authTokens.refreshToken);
    this.gmailClient = gmail({ auth: this.auth, version: "v1" });
  }

  async refreshAccessToken(refreshToken: string) {
    const tokens = await getAccessToken(refreshToken);
    this.auth.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: refreshToken,
    });
    return tokens;
  }

  async listThreads() {
    try {
      const res = await this.gmailClient.users.threads.list({
        userId: "me",
        auth: this.auth,
        labelIds: ["INBOX"],
        maxResults: 30,
      });

      return res.data.threads;
    } catch (e) {
      console.log("Error in listThreads:", e);
      throw new Error("failed to listThreads");
    }
  }

  async getThread(threadId: string) {
    try {
      const res = await this.gmailClient.users.threads.get({
        userId: "me",
        id: threadId,
        auth: this.auth,
        format: "full",
      });
      return res.data;
    } catch (e) {
      console.log("Error in getThread:", e);
      throw new Error("failed to getThread");
    }
  }

  async setWatch(topicName: string) {
    try {
      const res = await this.gmailClient.users.watch({
        userId: "me",
        auth: this.auth,
        requestBody: {
          topicName: topicName,
          labelIds: ["INBOX"],
        },
      });
      return res.data;
    } catch (e) {
      console.log("Error in setWatch:", e);
      throw new Error("failed to setWatch");
    }
  }

  async getMessage(messageId: string) {
    try {
      const res = await this.gmailClient.users.messages.get({
        userId: "me",
        auth: this.auth,
        id: messageId,
        format: "full",
      });
      return res.data;
    } catch (e) {
      console.log("Error in getMessage:", e);
      throw new Error("failed to getMessage");
    }
  }

  async getAttachment(messageId: string, attachmentId: string) {
    try {
      const res = await this.gmailClient.users.messages.attachments.get({
        userId: "me",
        messageId: messageId,
        auth: this.auth,
        id: attachmentId,
      });

      return res.data;
    } catch (error) {
      console.log("Error in getAttachment:", error);
      throw new Error("failed to getAttachment");
    }
  }

}
