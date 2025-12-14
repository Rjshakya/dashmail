import { Config, defineConfig } from "drizzle-kit";

// "postgresql://postgres:password@localhost/postgres"
const dbUrl = process.env.DB_URL;
// process.env.DATABASE_URL

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/*",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
