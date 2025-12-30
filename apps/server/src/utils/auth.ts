import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { createDB } from "../db/config";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const getAuth = async () => {
  const { CLIENT_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, HYPERDRIVE } = env;
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
      // session: {
      //   create: {
      //     async after(session, context) {
      //       try {
      //         const now = new Date();
      //         const yesterday = new Date();
      //         yesterday.setDate(yesterday.getDate() - 1);
      //         yesterday.setHours(0, 0, 0, 0);

      //         await env.GenerateMailReportWorkflow.create({
      //           id: session.id,
      //           params: {
      //             userId: session.userId,
      //             after: yesterday,
      //             before: now,
      //           },
      //         });
      //       } catch (e) {
      //         console.error("Error in session create after hook:", e);
      //       }
      //     },
      //   },
      // },
      user: {
        create: {
          async after(user, context) {
            try {
              const now = new Date();
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              yesterday.setHours(0, 0, 0, 0);

              await env.GenerateMailReportWorkflow.create({
                id: user.id,
                params: {
                  userId: user.id,
                  after: yesterday,
                  before: now,
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
