import { z } from "zod/v3";

export const FinalMessageSchema = z.object({
  metadata: z.object({
    totalProcessed: z.number(),
    topSender: z.object({
      name: z.string(),
      count: z.number(),
      reason: z.string(),
    }),
    totalSpent: z.array(
      z.object({
        currency: z.string(),
        amount: z.number(),
      }),
    ),
  }),
  personalisedMessage: z.string(),
});
export type FinalReportType = z.infer<typeof FinalMessageSchema>;
