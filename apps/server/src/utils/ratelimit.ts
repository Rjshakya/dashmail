import { type Duration, Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";
import { sleep } from "./general";

export interface IgetRateLimit {
  token: number;
  duration: Duration;
  key: string;
  delay?: number;
  throwError?: boolean;
}

// const ratelimit = new Ratelimit({
//   redis: getRedis(),
//   limiter: Ratelimit.slidingWindow(100, "10 s"),
//   /**
//    * Optional prefix for the keys used in redis. This is useful if you want to share a redis
//    * instance with other applications and want to avoid key collisions.
//    */
//   prefix: "DashMail:ratelimit",
// });

export const useRateLimit = async ({
  token,
  duration,
  key,
  throwError = false,
  delay = 200,
}: IgetRateLimit) => {
  const rl = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(token, duration),
    /**
     * Optional prefix for the keys used in redis. This is useful if you want to share a redis
     * instance with other applications and want to avoid key collisions.
     */
    prefix: "DashMail:ratelimit",
  });

  const { success } = await rl.limit(key);

  if (!success) {
    if (delay) {
      // throttle the req
      await sleep(delay);
    }
    
    if (throwError) {
      // throw error
      throw new Error("rate-limit-error");
    }
  }
};
