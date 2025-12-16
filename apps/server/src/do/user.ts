import { Agent } from "agents";
import { createDB } from "../db/config";
import { account } from "../db/schema/auth-schema";
import { eq } from "drizzle-orm";
import { GmailManager, IGmailManagerConfig } from "../services/gmailManager";
import { gmail } from "@googleapis/gmail";
import { OAuth2Client } from "google-auth-library";

export interface IUserMailInboxDOrunInput {
  userId: string;
  refreshToken: string;
  accessToken: string;
  labelIds: string[];
  maxResults: number;
}

export class UserMailInboxDO extends Agent {
  async run(params: IUserMailInboxDOrunInput) {
    const {
      userId,
      accessToken,
      labelIds = ["INBOX", "UNREAD"],
      maxResults = 10,
      refreshToken,
    } = params;

    if (!refreshToken) {
      console.warn("No token found for user , returing", userId);
      return;
    }

    const storedToken = await this.ctx.storage.get<string>(
      `${userId}:refreshToken`
    );

    // update refresh only if there is not token , or it is different
    if (!storedToken || storedToken !== refreshToken) {
      await this.ctx.storage.put<string>(
        `${userId}:refreshToken`,
        refreshToken
      );
    }

    const gmailManagerConfig: IGmailManagerConfig = {
      authTokens: { access_token: accessToken, refresh_token: refreshToken },
    };

    const gmail = new GmailManager(gmailManagerConfig);
    await gmail.refreshAccessToken(refreshToken);

    const threads = await gmail.listThreads(labelIds, maxResults);

    if (!threads || !threads.length) {
      console.warn("no threads found");
      return;
    }

    const config = {
      authTokens: { refresh_token: refreshToken, access_token: accessToken },
    };

    const threadsWithId = threads.map((m) => m && (m.id as string));

    // storing only thread id of each user's mail Inbox
    await this.ctx.storage.put(`${userId}:threads`, threadsWithId);

    const { id } = this.env.Mail_Thread.getByName(
      `${userId}:mail_inbox:threads`
    );

    const stub = this.env.Mail_Thread.get(id);
    await stub.run(config, userId, threadsWithId);

    console.log(
      `[UserMailInboxDO]:${userId} threads-run`,
      threadsWithId.length
    );
  }

  async getUserThreadsIds(userId: string) {
    return await this.ctx.storage.get<string[]>(`${userId}:threads`);
  }
}
