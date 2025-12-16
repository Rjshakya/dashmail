import { env, WorkflowEntrypoint } from "cloudflare:workers";
import { createDB } from "../db/config";
import { eq } from "drizzle-orm";
import { account } from "../db/schema/auth-schema";
import { getAccessToken, processGmailRawMessage } from "../utils/gmail-utils";
import { gmail, gmail_v1 } from "@googleapis/gmail";
import { OAuth2Client } from "google-auth-library";
import { Email } from "postal-mime";
import { GmailManager } from "../services/gmailManager";

export interface ISyncAndWatchInboxMailsFlowInput {
  userId: string;
}

export class SyncAndWatchInboxMailsFlow extends WorkflowEntrypoint {
  async run(
    event: Readonly<
      CloudflareWorkersModule.WorkflowEvent<ISyncAndWatchInboxMailsFlowInput>
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

    await step.do("set-watch-mails", async () => {
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

    const getInboxMessageList = await step.do(
      "get-all-inbox-threads",
      {
        retries: { limit: 0, delay: 0 },
      },
      async () => {
        try {
          // const auth = new OAuth2Client();
          // auth.setCredentials({
          //   access_token: tokens?.accessToken,
          //   refresh_token: tokens?.refreshToken,
          // });

          // const gmailClient = gmail("v1");
          // const res = await gmailClient.users.messages.list({
          //   userId: "me",
          //   auth,
          //   labelIds: ["INBOX", "UNREAD"],
          //   maxResults: 20,
          //   fields: "messages(id)",
          // });

          // return res.data.messages;

          // const gmail = new GmailManager({
          //   authTokens: {
          //     access_token: tokens?.accessToken,
          //     refresh_token: tokens?.refreshToken,
          //   },
          // });

          console.log(tokens);
          if (!tokens?.refreshToken) {
            console.error("no refresh-");
          }

          const { id } = env.User_Mail_Inbox.getByName(`${userId}:mail_inbox`);
          const stub = env.User_Mail_Inbox.get(id);
          await stub.run({
            userId,
            accessToken: tokens?.accessToken as string,
            refreshToken: tokens?.refreshToken as string,
            labelIds: ["INBOX"],
            maxResults: 50,
          });
        } catch (e) {
          console.log("Error in get-mail-threads:", e);
          throw new Error("failed to get-mail-threads");
        }
      }
    );

    // const getRawMessages = await step.do("get-thread-messages", async () => {
    //   try {
    //     if (!getInboxMessageList || getInboxMessageList?.length === 0) return;

    //     const auth = new OAuth2Client();
    //     auth.setCredentials({
    //       access_token: tokens?.accessToken,
    //       refresh_token: tokens?.refreshToken,
    //     });

    //     const gmailClient = gmail("v1");
    //     const promises = getInboxMessageList
    //       .filter((message) => message.id)
    //       .map((message) => {
    //         return gmailClient.users.messages.get({
    //           userId: "me",
    //           id: message.id as string,
    //           auth,
    //           format: "raw",
    //         });
    //       });

    //     const threadDetails = await Promise.all(promises);
    //     return threadDetails.map((td) => td.data);
    //   } catch (e) {
    //     console.log("Error in get-thread-messages:", e);
    //     throw new Error("failed to get-thread-messages");
    //   }
    // });

    // const processMessages = await step.do("process-messages", async () => {
    //   try {
    //     console.log("process-threads:length:", getRawMessages?.length);
    //     if (!getRawMessages) return;

    //     const emails: Email[] = [];
    //     const auth = new OAuth2Client();
    //     auth.setCredentials({
    //       access_token: tokens?.accessToken,
    //       refresh_token: tokens?.refreshToken,
    //     });

    //     for (const message of getRawMessages) {
    //       if (!message.id) continue;
    //       const raw = message.raw;
    //       if (!raw) continue;

    //       const decoded = Buffer.from(raw, "base64url").toString();
    //       const email = await processGmailRawMessage(decoded);
    //       emails.push(email);
    //     }

    //     console.log("Total emails processed:", emails.length);
    //   } catch (e) {
    //     console.log("Error in process-messages:", e);
    //     throw new Error("failed to process-messages");
    //   }
    // });
  }
}
