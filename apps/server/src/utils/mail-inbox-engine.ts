import { env } from "cloudflare:workers";
import { GmailManager, IGmailManagerConfig } from "../services/gmailManager";
import { execAsync } from "./general";
import { AggregatorAgent } from "../ai/aggregator/agent";
import { KeyManager } from "../utils/key.manager";
import { RunResponse } from "../do/thread.do";
import { ThreadSummarySchema } from "../ai/summary/schema";
import { financialDocument } from "../ai/finance/schema";

export interface IUserMailInboxEngine {
  after: Date;
  before: Date;
  config: IGmailManagerConfig;
  labels: string[];
  userId: string;
}

export interface IUserMailInboxEngineParams {
  after: Date;
  before: Date;
  config: IGmailManagerConfig;
  labels: string[];
  userId: string;
}

export class UserMailInboxEngine implements IUserMailInboxEngine {
  after: Date;
  before: Date;
  config: IGmailManagerConfig;
  labels: string[];
  userId: string;

  constructor(params: IUserMailInboxEngineParams) {
    const { after, before, config, labels, userId } = params;
    this.config = config;
    this.after = after;
    this.before = before;
    this.labels = labels;
    this.userId = userId;
  }

  private async runEngine() {
    return execAsync("runEngine", async () => {
      const { after, before, config, labels, userId } = this;
      let batch = 1;
      let nextPageToken: string | undefined;
      const gmail = new GmailManager(config);

      const UserMailInboxDOInstanceId = KeyManager.do.getInboxByTime({
        userId,
        after,
        before,
      });

      const { id } = env.MailInbox.getByName(UserMailInboxDOInstanceId);
      const userMailInbox = env.MailInbox.get(id);

      while (true) {
        const threads = await gmail.listThreadBasedOnTime({
          after,
          before,
          labelIds: labels,
          maxResults: 100,
          pageToken: nextPageToken,
        });

        console.log("engine:totalestimatesize:", threads.resultSizeEstimate);

        if (!threads.threads || threads.threads.length === 0) {
          continue;
        }

        const threadIds: string[] = threads.threads
          .map((th) => {
            if (th.id && "id" in th) {
              return th.id;
            }
          })
          .filter(Boolean) as string[];

        const threadsBatchKey = KeyManager.do.getThreadsByBatch(userId, batch);
        const { id } = env.Threads.getByName(threadsBatchKey);

        const stub = env.Threads.get(id);
        const batchReport = await stub.run(config, userId, threadIds);

        if (!batchReport) {
          continue;
        }

        console.log("engine:batch:report", batchReport);
        await userMailInbox.putBatchReportByTime({
          after,
          batchId: batch,
          before,
          userId,
          mailThreadRunResponse: batchReport,
        });

        if (!threads.nextPageToken) {
          break;
        }

        nextPageToken = threads.nextPageToken;
        batch++;
      }
      await userMailInbox.putTotalBatchByTime(userId, after, before, batch);

      return {
        totalBatches: batch,
        after,
        before,
        userId,
      };
    });
  }

  private async getFullReport() {
    return execAsync("getFullReport", async () => {
      const { after, before, totalBatches, userId } = await this.runEngine();
      const UserMailInboxDOInstanceId = KeyManager.do.getInboxByTime({
        userId,
        after,
        before,
      });

      const { id } = env.MailInbox.getByName(UserMailInboxDOInstanceId);
      const userMailInbox = env.MailInbox.get(id);
      let fullReport = ``;
      const uiData = {
        summaries: [] as ThreadSummarySchema[],
        financials: [] as financialDocument[],
        metadata: {},
        fitered: {},
      };

      for (let i = 1; i <= totalBatches; i++) {
        const report = await userMailInbox.getBatchReportByTime({
          after,
          before,
          userId,
          batchId: i,
        });

        const batchReport = (await JSON.parse(report || "{}")) as RunResponse;
        const serializeInLLm = `<thread_batch id=${i}>
            <summaries>
              ${JSON.stringify(batchReport?.summaries?.summaries, null, 2)}
            <summaries>
            <financial_analysis>
              ${JSON.stringify(batchReport?.financialAnalysis?.financialDocuments, null, 2)}
            <financial_analysis>
            <filtered>
              ${JSON.stringify(batchReport?.summaries?.filtered, null, 2)}
            <filtered>
            <financial_metadata>
              ${JSON.stringify(batchReport?.financialAnalysis.metadata, null, 2)}
            <financial_metadata>
          <thread_batch>`;

        fullReport += serializeInLLm;
        uiData.summaries = [...uiData.summaries, ...batchReport.summaries.summaries];

        uiData.financials = [
          ...uiData.financials,
          ...batchReport.financialAnalysis.financialDocuments,
        ];

        uiData.metadata = batchReport.financialAnalysis.metadata;
        uiData.fitered = batchReport.summaries.filtered;
      }

      return { after, before, totalBatches, userId, fullReport, uiData };
    });
  }

  async generate() {
    return execAsync("UserMailInboxEngine-generate", async () => {
      const { after, before, userId, fullReport, uiData } = await this.getFullReport();
      return { after, before, userId, fullReport, uiData };
    });
  }
}
