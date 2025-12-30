import { Agent } from "agents";
import { createDB } from "../db/config";
import { account } from "../db/schema/auth-schema";
import { eq } from "drizzle-orm";
import { GmailManager, IGmailManagerConfig } from "../services/gmailManager";
import { type gmail_v1 } from "@googleapis/gmail";
import { execAsync } from "../utils/general";
import { RunResponse } from "./thread.do";
import { FinalReportType } from "../ai/aggregator/schema";
import { KeyManager } from "../utils/key.manager";

export interface IUserMailInboxDOrunInput {
  userId: string;
  refreshToken: string;
  accessToken: string;
  labelIds: string[];
  maxResults: number;
  after: Date;
  before: Date;
}

export interface IUserMailInboxDOCredentails {
  refreshToken: string;
  accessToken: string;
}

export interface IPutBatchReportByTime {
  mailThreadRunResponse: RunResponse;
  userId: string;
  after: Date;
  before: Date;
  batchId: number;
}

export interface IGetBatchReportByTime {
  userId: string;
  after: Date;
  before: Date;
  batchId: number;
}

export interface IGetCombinedReport {
  userId: string;
  after: Date;
  before: Date;
}

export interface IscheduleEmailParams {
  time: { hour: string; minute: string };
  userId: string;
}

export interface IscheduleReportDetails {
  id: string;
  time: { hour: string; minute: string };
}

export class MailInbox extends Agent {
  async run(params: IUserMailInboxDOrunInput) {
    return execAsync("run-UserMailInboxDO", async () => {
      const {
        userId,
        accessToken,
        labelIds = ["INBOX", "UNREAD"],
        maxResults = 20,
        refreshToken,
        after,
        before,
      } = params;

      if (!refreshToken) {
        console.warn("[UserMailInboxDO]:No refresh token found for user returning void;", userId);
        return;
      }

      const storedToken = await this.getCredentials(userId);
      await this.putUserId(userId);

      // update credentials only if there is no refresh-token , or if it is changed
      if (!storedToken || storedToken?.refreshToken !== refreshToken) {
        await this.putCredentials(userId, { accessToken, refreshToken });
      }

      const gmailManagerConfig: IGmailManagerConfig = {
        authTokens: { access_token: accessToken, refresh_token: refreshToken },
      };

      const gmail = new GmailManager(gmailManagerConfig);
      await gmail.refreshAccessToken(refreshToken);

      const threadsData = await gmail.listThreadBasedOnTime({
        after,
        before,
        labelIds,
        maxResults,
      });

      const threads = threadsData.threads;

      if (!threads || !threads.length) {
        console.warn("[UserMailInboxDO]: no threads found returning void;");
        return;
      }

      const config = {
        authTokens: { refresh_token: refreshToken, access_token: accessToken },
      };

      const threadsWithId = threads.map((m) => m && (m.id as string));

      const { id } = this.env.Threads.getByName(KeyManager.do.getInboxThreads(userId));
      const stub = this.env.Threads.get(id);
      await stub.run(config, userId, threadsWithId);
    });
  }

  async getCredentials(userId: string): Promise<IUserMailInboxDOCredentails | undefined> {
    try {
      const key = `${userId}:credentials`;

      const credentials = await this.ctx.storage.get<IUserMailInboxDOCredentails>(key);

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

  async putCredentials(userId: string, credentials: IUserMailInboxDOCredentails) {
    try {
      const key = `${userId}:credentials`;
      await this.ctx.storage.put(key, credentials);
    } catch (e) {
      console.error("[UserMailInboxDO] failed to putCredentials", userId, credentials);
      throw e;
    }
  }

  async getUserId() {
    return this.ctx.storage.get<string>("userId");
  }

  async putUserId(userId: string) {
    await this.ctx.storage.put("userId", userId);
  }

  async getBatchReportByTime(params: IGetBatchReportByTime): Promise<string | undefined> {
    const { after, batchId, before, userId } = params;

    const key = KeyManager.do.getReportByTimeKey({
      after,
      batchId,
      before,
      userId,
    });
    return await this.ctx.storage.get<string>(key);
  }

  async putBatchReportByTime(params: IPutBatchReportByTime) {
    const { after, before, mailThreadRunResponse, userId, batchId } = params;
    const key = KeyManager.do.getReportByTimeKey({
      after,
      batchId,
      before,
      userId,
    });
    const storeInString = JSON.stringify(mailThreadRunResponse, null, 2);
    await this.ctx.storage.put<string>(key, storeInString);
    return true;
  }

  async deleteReportByTime(params: IGetBatchReportByTime) {
    const { after, batchId, before, userId } = params;
    const key = KeyManager.do.getReportByTimeKey({
      after,
      batchId,
      before,
      userId,
    });
    await this.ctx.storage.delete(key);
    return true;
  }

  async putFinalReport(userId: string, before: Date, report: FinalReportType) {
    const key = KeyManager.do.getFinalReport({ userId, before });
    await this.ctx.storage.put<string>(key, JSON.stringify(report));
    return key;
  }

  async getFinalReport(userId: string, after: Date, before: Date) {
    const key = KeyManager.do.getFinalReport({ userId, before });
    const report = await this.ctx.storage.get<string>(key);
    const totalBatch = await this.getTotalBatchByTime({ userId, after, before });
    if (!report) return null;
    return { report: JSON.parse(report), totalBatch } as {
      report: FinalReportType;
      totalBatch: number;
    };
  }

  async deleteFinalReport(userId: string, before: Date) {
    const key = KeyManager.do.getFinalReport({ userId, before });
    await this.ctx.storage.delete(key);
    return true;
  }

  async getTotalBatchByTime(params: { userId: string; after: Date; before: Date }) {
    const { after, before, userId } = params;

    const key = KeyManager.do.getTotalBatchByTimeKey({ userId, after, before });
    return this.ctx.storage.get<number>(key);
  }

  async putTotalBatchByTime(userId: string, after: Date, before: Date, totalBatches: number) {
    const key = KeyManager.do.getTotalBatchByTimeKey({ userId, after, before });
    await this.ctx.storage.put<number>(key, totalBatches);
  }

  async runReportWorkflow(userId: string) {
    return execAsync("runReportWorkflow", async () => {
      const after = new Date();
      after.setDate(after.getDate() - 1);
      after.setHours(0, 0, 0, 0);
      const before = new Date();

      const id = userId + before.toISOString().split("T")[0] + 6;

      await this.env.MailScheduleWorkflow.create({
        id,
        params: {
          userId,
          after,
          before,
        },
      });
    });
  }

  async scheduleReport(params: IscheduleEmailParams) {
    const { time, userId } = params;
    const existingCron = this.getExistingReportSchedule();

    if (existingCron && existingCron?.id) {
      this.cancelSchedule(existingCron.id);
    }

    const cron = `${time.minute} ${time.hour} * * *`;
    const scheduleId = await this.schedule(cron, "runReportWorkflow", userId);
    this.ctx.storage.kv.put<IscheduleReportDetails>(`scheduleReport`, { id: scheduleId.id, time });
    return scheduleId.id;
  }

  getExistingReportSchedule() {
    return this.ctx.storage.kv.get<IscheduleReportDetails>(`scheduleReport`);
  }
}
