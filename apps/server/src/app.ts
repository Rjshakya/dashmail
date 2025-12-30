import { Hono } from "hono";
import { getAuth } from "./utils/auth";
import { env } from "cloudflare:workers";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth-middleware";
import { Threads } from "./do/thread.do";
import { MailInbox } from "./do/mail.inbox.do";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDB } from "./db/config";
import { user } from "./db/schema/auth-schema";
import { GenerateMailReportWorkflow } from "./workflows/report";
import { KeyManager } from "./utils/key.manager";
import { MailScheduleWorkflow } from "./workflows/schedule";
import { getUIData } from "./utils/mail-inbox-kv";
import { SendEmailOptions } from "@unosend/node";
import { unosendEmail } from "./utils/email";
import { useRateLimit } from "./utils/ratelimit";

type Variables = {
  userId: string;
  sessionId: string;
};

export interface IEmailQueueMsg {
  to: string;
  text: string;
}

const app = new Hono<{ Variables: Variables }>()
  .use(
    cors({
      origin: [env.CLIENT_URL],
      credentials: true,
    }),
  )
  .on(["POST", "GET"], "/api/auth/*", async (c) => {
    const auth = await getAuth();
    return auth.handler(c.req.raw);
  })
  .get("/", (c) => {
    return c.text("Hello Hono!");
  })
  .use(authMiddleware)
  .post(
    "/api/generate",
    zValidator(
      "json",
      z.object({
        userId: z.string(),
        after: z.string(),
        before: z.string(),
      }),
    ),
    async (c) => {
      const { after, before, userId } = c.req.valid("json");
      const id = c.get("sessionId");

      useRateLimit({ token: 95, duration: "1 s", key: c.req.path, delay: 1000 });
      const result = await env.GenerateMailReportWorkflow.create({
        id: id,
        params: {
          after: new Date(after),
          before: new Date(before),
          userId,
        },
      });

      return c.json(
        {
          status: (await result.status()).status,
          after,
          before,
          userId,
        },
        200,
      );
    },
  )
  .get("/users", async (c) => {
    const db = await createDB(env.HYPERDRIVE.connectionString);
    const users = await db.select({ id: user.id, email: user.email }).from(user).limit(50);
    return c.json(users, 200);
  })
  .get(
    "/report/:userId/:after/:before",
    zValidator("param", z.object({ userId: z.string(), after: z.string(), before: z.string() })),
    async (c) => {
      const { after, before, userId } = c.req.valid("param");
      useRateLimit({ token: 1000, duration: "1 s", key: userId, delay: 1000 });
      const data = await getUIData(userId);
      return c.json(data || [], 200);
    },
  )
  .post(
    "/schedule",
    zValidator(
      "json",
      z.object({
        userId: z.string(),
        time: z.object({ hour: z.string().max(2), minute: z.string().max(2) }),
      }),
    ),
    async (c) => {
      useRateLimit({ token: 1000, duration: "1 s", key: c.req.path, delay: 1000 });
      const { time, userId } = c.req.valid("json");
      const { id } = env.MailInbox.getByName(KeyManager.do.getDailyReportSchedule(userId));
      const stub = env.MailInbox.get(id);
      const res = await stub.scheduleReport({ time, userId });
      return c.json({ res, time }, 200);
    },
  )
  .get("/schedule", async (c) => {
    const userId = c.get("userId");
    useRateLimit({ token: 1000, duration: "1 s", key: userId, delay: 1000 });
    const { id } = env.MailInbox.getByName(KeyManager.do.getDailyReportSchedule(userId));
    const stub = env.MailInbox.get(id);
    const res = await stub.getExistingReportSchedule();
    return c.json(res, 200);
  })
  .onError((err, c) => {
    console.error("Global error handler:", err);

    if (err.message === "rate-limit-error") {
      return c.json({ message: "Ratelimited", details: err.message }, 429);
    }
    return c.json({ message: "Internal Server Error", details: err.message }, 500);
  });

export { Threads, MailInbox, GenerateMailReportWorkflow, MailScheduleWorkflow };
export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<IEmailQueueMsg>, env: Cloudflare.Env) {
    try {
      // currently sending message one by one
      // later will send the whole batch.

      for (const message of batch.messages) {
        const email = {
          from: "notifications@dashmail.planetform.xyz",
          subject: "Your daily rewind",
          to: message.body.to,
          text: message.body.text,
        } satisfies SendEmailOptions;

        const res = await unosendEmail(email);
        if (res && res.id) {
          message.ack();
        }

        // retry
      }

      // const emailBody = batch.messages.map((m) => {
      //   return {
      //     from: "notifications@dashmail.planetform.xyz",
      //     subject: "Your daily rewind",
      //     to: m.body.to,
      //     text: m.body.text,
      //   } satisfies SendEmailOptions;
      // });
      // console.log(emailBody);
      // await unosendEmailBatch(emailBody);
      // batch.ackAll();
    } catch (e) {
      console.error(e);
    }
  },
};
