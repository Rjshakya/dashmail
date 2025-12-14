
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { account, session, user, verification } from "./schema/auth-schema";

export const createDB = async (connectionString:string) => {
  const pool = new Pool({
    connectionString,
  });

  return drizzle({
    client: pool,
    schema: {
      user,
      account,
      verification,
      session,
    },
  });
};
