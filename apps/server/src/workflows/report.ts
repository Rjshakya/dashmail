/**
 *
 * @description we will generate reports based on user'emails
 * here we generate reports that are time based.
 * for example if a user want to get it report of last 3 month.
 * this is a big timeline , and there might be thousands of email in this timeline,
 * in order to correctly process all mail threads during the period,
 * we'll use cloudflare workflows .
 *
 */

import { env, WorkflowEntrypoint } from "cloudflare:workers";
import { execAsync } from "../utils/general";
import { createDB } from "../db/config";
import { account } from "../db/schema/auth-schema";
import { eq } from "drizzle-orm";
import { NonRetryableError } from "cloudflare:workflows";
import { getAccessToken } from "../utils/gmail-utils";
import { IGmailManagerConfig } from "../services/gmailManager";
import { UserMailInboxEngine } from "../utils/mail-inbox-engine";
import { saveUIData } from "../utils/mail-inbox-kv";

interface IEmailReportWorkflowParams {
  userId: string;
  after: Date;
  before: Date;
}

export class GenerateMailReportWorkflow extends WorkflowEntrypoint {
  async run(
    event: Readonly<CloudflareWorkersModule.WorkflowEvent<IEmailReportWorkflowParams>>,
    step: CloudflareWorkersModule.WorkflowStep,
  ) {
    const { userId, after, before } = event.payload;
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
          })
          .from(account)
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

    await step.do("save-ui-data", async () => {
      return execAsync("[GenerateMailReportWorkflow]:save-ui-date", async () => {
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
      });
    });

    return runMailEngine;
  }
}
