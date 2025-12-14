import { Hono } from "hono";
import { getAuth } from "./utils/auth";
import { env } from "cloudflare:workers";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth-middleware";
import { SyncAndWatchInboxMailsFlow } from "./workflows/gmail";

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

export { SyncAndWatchInboxMailsFlow };
export default app;
