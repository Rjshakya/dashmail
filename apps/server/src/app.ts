import { Hono } from "hono";
import { getAuth } from "./utils/auth";
import { env } from "cloudflare:workers";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth-middleware";
import { SyncAndWatchInboxMailsFlow } from "./workflows/sync";
import { MailThreadDO } from "./do/thread";
import { UserMailInboxDO } from "./do/user";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { createDB } from "./db/config";
import { user } from "./db/schema/auth-schema";

const app = new Hono();

app
  .use(
    cors({
      origin: [env.CLIENT_URL],
      credentials: true,
    })
  )
  .get("/", (c) => {
    return c.text("Hello Hono!");
  })
  .get(
    "/report/:userId",
    zValidator("param", z.object({ userId: z.string().nonoptional() })),
    async (c) => {
      const { userId } = c.req.valid("param");
      const { id } = env.Mail_Thread.getByName(`${userId}:mail_inbox:threads`);
      const stub = env.Mail_Thread.get(id);
      const summaries = await stub.getThreadBatchAISummary(userId);

      if (summaries) {
        return c.json(summaries, 200);
      }
      return c.json("no results", 200);
    }
  )
  .get("/users", async (c) => {
    const db = await createDB(env.HYPERDRIVE.connectionString);
    const users = await db
      .select({ id: user.id, email: user.email })
      .from(user);
    return c.json(users, 200);
  })
  .post("/api/gmail/webhook", async (c) => {
    console.log("Received Gmail webhook:");
    console.log("json body:", await c.req.json());

    return c.json({ received: true }, 200);
  })
  .on(["POST", "GET"], "/api/auth/*", async (c) => {
    const auth = await getAuth();
    return auth.handler(c.req.raw);
  })
  .use(authMiddleware)
  .onError((err, c) => {
    console.error("Global error handler:", err);
    return c.json(
      { message: "Internal Server Error", details: err.message },
      500
    );
  });

export { SyncAndWatchInboxMailsFlow, MailThreadDO, UserMailInboxDO };
export default app;
