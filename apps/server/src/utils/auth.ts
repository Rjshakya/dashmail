import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { createDB } from "../db/config";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const getAuth = async () => {
  const { CLIENT_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, HYPERDRIVE } =
    env;
  const db = await createDB(HYPERDRIVE.connectionString);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    socialProviders: {
      google: {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        accessType: "offline",
      },
    },
    trustedOrigins: [CLIENT_URL],
    databaseHooks: {
      session: {
        create: {
          async after(session, context) {
            try {
              await env.SYNC_AND_WATCH_MAIL_INBOX_WORKFLOW.create({
                id: session.id,
                params: {
                  userId: session.userId,
                },
              });
            } catch (e) {
              console.error("Error in session create after hook:", e);
            }
          },
        },
      },
    },
  });
};
