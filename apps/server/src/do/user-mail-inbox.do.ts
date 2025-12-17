import { Agent } from "agents";
import { createDB } from "../db/config";
import { account } from "../db/schema/auth-schema";
import { eq } from "drizzle-orm";
import { GmailManager, IGmailManagerConfig } from "../services/gmailManager";
import { type gmail_v1 } from "@googleapis/gmail";

export interface IUserMailInboxDOrunInput {
  userId: string;
  refreshToken: string;
  accessToken: string;
  labelIds: string[];
  maxResults: number;
}

export interface IUserMailInboxDOCredentails {
  refreshToken: string;
  accessToken: string;
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

    const storedToken = await this.getCredentials(userId);

    // update refresh only if there is no token , or it is different
    if (!storedToken || storedToken?.refreshToken !== refreshToken) {
      await this.putCredentials(userId, { accessToken, refreshToken });
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

    await this.putUserThreads(userId, threads);
    const config = {
      authTokens: { refresh_token: refreshToken, access_token: accessToken },
    };

    const threadsWithId = threads.map((m) => m && (m.id as string));

    // storing only thread id of each user's mail Inbox
    await this.ctx.storage.put(`${userId}:threads`, threadsWithId);

    const { id } = this.env.MailThreadDO.getByName(
      `${userId}:mail_inbox:threads`
    );

    const stub = this.env.MailThreadDO.get(id);
    await stub.run(config, userId, threadsWithId);

    console.log(
      `[UserMailInboxDO]:${userId} threads-batch-processed`,
      threadsWithId.length
    );
  }

  async getUserThreadsIds(userId: string) {
    return await this.ctx.storage.get<string[]>(`${userId}:threadIds`);
  }

  async getCredentials(
    userId: string
  ): Promise<IUserMailInboxDOCredentails | undefined> {
    try {
      const key = `${userId}:credentials`;

      const credentials =
        await this.ctx.storage.get<IUserMailInboxDOCredentails>(key);

      if (!credentials) {
        const db = await createDB(this.env.HYPERDRIVE.connectionString);
        const [tokens] = await db
          .select({
            accessToken: account.accessToken,
            refreshToken: account.refreshToken,
          })
          .from(account)
          .where(eq(account.userId, userId));

        if (tokens.accessToken && tokens.refreshToken) {
          await this.ctx.storage.put(key, tokens);
          return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          };
        }
      }

      return credentials;
    } catch (e) {
      console.error("[UserMailInboxDO]:failed to getCredentials", userId);
      throw e;
    }
  }

  async putCredentials(
    userId: string,
    credentials: IUserMailInboxDOCredentails
  ) {
    try {
      const key = `${userId}:credentials`;
      await this.ctx.storage.put(key, credentials);
    } catch (e) {
      console.error(
        "[UserMailInboxDO] failed to putCredentials",
        userId,
        credentials
      );
      throw e;
    }
  }

  async getUserThreads(userId: string) {
    try {
      const key = `${userId}:mail_inbox:threads`;
      let threads = await this.ctx.storage.get<gmail_v1.Schema$Thread[] | []>(
        key
      );

      if (!threads || !threads.length) {
        const credentials = await this.getCredentials(userId);
        if (!credentials) return [];

        const gmail = new GmailManager({
          authTokens: {
            access_token: credentials.accessToken,
            refresh_token: credentials.refreshToken,
          },
        });
        await gmail.refreshAccessToken(credentials.refreshToken);

        threads = await gmail.listThreads(["INBOX"], 30);
      }

      return threads || [];
    } catch (e) {
      console.error("[UserMailInboxDO]:failed to getUserThreads", userId);
      throw e;
    }
  }

  async putUserThreads(userId: string, threads: gmail_v1.Schema$Thread[] | []) {
    try {
      const key = `${userId}:mail_inbox:threads`;
      await this.ctx.storage.put(key, threads);
    } catch (e) {
      console.error(
        "[UserMailInboxDO]:failed to putUserThreads",
        userId,
        threads
      );
      throw e;
    }
  }

  async updateUserThreads(userId: string, thread: gmail_v1.Schema$Thread) {
    try {
      const key = `${userId}:mail_inbox:threads`;

      const existingThreads =
        await this.ctx.storage.get<gmail_v1.Schema$Thread[]>(key);
      if (!existingThreads) return false;

      const updatedThreads = [...existingThreads, thread];
      await this.ctx.storage.put(key, updatedThreads);
      return true;
    } catch (e) {
      console.error(
        "[UserMailInboxDO]:failed to updateUserThreads",
        userId,
        thread.id
      );
      throw e;
    }
  }

  async setTime() {
    this.alarm();
  }
}
