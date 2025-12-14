import { createMiddleware } from "hono/factory";
import { getAuth } from "../utils/auth";

export const authMiddleware = createMiddleware(async (c, next) => {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("userId", null);
    c.set("sessionId", null);
    return c.json("unauthorised", 401);
  }
  c.set("userId", session.user.id);
  c.set("sessionId", session.session.id);
  return await next();
});
