export const KeyManager = {
  do: {
    getUserInbox: (userId: string) => {
      return `${userId}:mail_inbox`.trim();
    },
    getInboxByTime: (params: { userId: string; after: Date; before: Date }) => {
      const { before, userId } = params;
      return `${userId}:mail:inbox:today:${before.toISOString().split("T")[0]}`.trim();
    },
    getFinalReport: (params: { before: Date; userId: string }) => {
      const { before, userId } = params;
      return `${userId}:mail_inbox:aggregate:report:today:${before.toISOString().split("T")[0]}`.trim();
    },
    getMailInbox: (userId: string) => `${userId}:mail:inbox`.trim(),
    getInboxThreads: (userId: string) => `${userId}:mail:inbox:threads`.trim(),
    getTotalBatchByTimeKey: ({
      after,
      before,
      userId,
    }: {
      userId: string;
      after: Date;
      before: Date;
    }) =>
      `${userId}:inbox:total:batches:after:${after.toISOString().split("T")[0]}:before:${before.toISOString().split("T")[0]}`.trim(),
    getReportByTimeKey: ({
      after,
      before,
      userId,
      batchId,
    }: {
      userId: string;
      batchId: number;
      after: Date;
      before: Date;
    }) =>
      `${userId}:mail_inbox:report:batch:${batchId}:after:${after.toISOString().split("T")[0]}:before:${before.toISOString().split("T")[0]}`,
    getThreadsByBatch: (userId: string, batch: number) =>
      `${userId}:mail_inbox:threads:batch:${batch}`,
    getDailyReportSchedule: (userId: string) => {
      return `${userId}:daily:report:schedule`;
    },
  },
};
