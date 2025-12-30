import { Redis } from "@upstash/redis/cloudflare";
import { env } from "cloudflare:workers";

export const getRedis = () => new Redis({ url: env.REDIS_URL, token: env.REDIS_TOKEN });
