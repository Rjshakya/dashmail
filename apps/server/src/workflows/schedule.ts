import { env, WorkflowEntrypoint } from "cloudflare:workers";
import { execAsync } from "../utils/general";
import { getAccessToken } from "../utils/gmail-utils";
import { createDB } from "../db/config";
import { account, user } from "../db/schema/auth-schema";
import { eq } from "drizzle-orm";
import { NonRetryableError } from "cloudflare:workflows";
import { UserMailInboxEngine } from "../utils/mail-inbox-engine";
import { IGmailManagerConfig } from "../services/gmailManager";
import { AggregatorAgent } from "../ai/aggregator/agent";
import { unosendEmail } from "../utils/email";
import { saveUIData } from "../utils/mail-inbox-kv";
import { SendEmailOptions } from "@unosend/node";
import { openRouterModels } from "../utils/models";

export interface IMailScheduleWorkflow {
  userId: string;
  after: Date;
  before: Date;
}

export class MailScheduleWorkflow extends WorkflowEntrypoint {
  async run(
    event: Readonly<CloudflareWorkersModule.WorkflowEvent<IMailScheduleWorkflow>>,
    step: CloudflareWorkersModule.WorkflowStep,
  ) {
    const { after, before, userId } = event.payload;
    if (!userId) {
      throw new NonRetryableError("[EmailReportWorkflow]: UserId not found");
    }

    const userCredentials = await step.do("get-user-credentials", async () => {
      return execAsync("EmailReportWorkflow:get-user-credentials", async () => {
        const db = await createDB(env.HYPERDRIVE.connectionString);
        const [credentials] = await db
          .select({
            accessToken: account.accessToken,
            refreshToken: account.refreshToken,
            email: user.email,
          })
          .from(account)
          .leftJoin(user, eq(account.userId, user.id))
          .where(eq(account.userId, userId));
        return credentials;
      });
    });

    const freshCredentials = await step.do("refresh-user's-credentials", async () => {
      return execAsync("refresh-user's-credentials", async () => {
        if (!userCredentials.refreshToken) {
          console.warn(
            "[EmailReportWorkflow]: step:[freshCredentials] - no refresh token found returning;",
          );
          return;
        }

        const res = await getAccessToken(userCredentials.refreshToken);
        return res;
      });
    });

    const runMailEngine = await step.do("run-mail-engine", async () => {
      return execAsync("[EmailReportWorkflow]:run-mail-engine", async () => {
        if (!freshCredentials?.accessToken) {
          return;
        }

        const config = {
          authTokens: {
            access_token: freshCredentials.accessToken,
            refresh_token: freshCredentials.refreshToken,
          },
        } as IGmailManagerConfig;

        const engine = new UserMailInboxEngine({
          after,
          before,
          config,
          userId,
          labels: ["INBOX"],
        });
        const res = await engine.generate();
        return res;
      });
    });

    const finalMessage = await step.do("gen-final-message", async () => {
      return execAsync("[MailScheduleWorkflow]:gen-final-message", async () => {
        if (!runMailEngine || !runMailEngine.fullReport) return;

        const { id } = env.GmailAgent.getByName(`${userId}`);
        const stub = env.GmailAgent.get(id);
        const res = await stub.run({
          model: openRouterModels["grok4.1"],
          prompt: runMailEngine?.fullReport,
          tokens: {
            access_token: freshCredentials?.accessToken,
            refresh_token: freshCredentials?.refreshToken,
          },
        });

        // const res = await AggregatorAgent(runMailEngine?.fullReport, "x-ai/grok-4.1-fast");
        // return res;

        return res;
      });
    });

    await step.do("save-ui-data", async () => {
      return execAsync("[MailScheduleWorkflow]:save-ui-date", async () => {
        if (!runMailEngine || !runMailEngine?.uiData) return;
        const uiData = runMailEngine.uiData;
        await saveUIData(
          {
            summaries: uiData.summaries,
            financial: uiData.financials,
            metaData: { filtered: uiData.fitered, metadata: uiData.metadata },
          },
          userId,
          24 * 60 * 60,
        );
        console.log("save-ui-date:complete");
      });
    });

    await step.do("send-mail", async () => {
      return execAsync("[MailScheduleWorkflow]:step:sendMail", async () => {
        if (!finalMessage || !userCredentials.email) return;
        console.log(finalMessage);

        await env.EMAIL_QUEUE.send(
          {
            to: userCredentials.email,
            text: finalMessage || "",
          },
          { delaySeconds: 1 },
        );
      });
    });
  }
}
