import { z } from "zod/v3";

export const ActionItemSchema = z.object({
  task: z.string().describe("Specific task or next step"),
  assignee: z.string().nullable().describe("Person responsible for the task"),
  dueDate: z.string().nullable().describe("ISO format date or null"),
  completed: z.boolean().describe("Whether the task is completed"),
});

export const ImportantDateSchema = z.object({
  date: z.string().describe("ISO format date"),
  description: z.string().describe("What the date represents"),
});

export const ThreadStatusSchema = z
  .enum(["resolved", "pending", "action_required", "informational"])
  .describe("Current status of the email thread");

export const PrioritySchema = z
  .enum(["high", "medium", "low"])
  .describe("Priority level of the thread");

export const SentimentSchema = z
  .enum(["positive", "neutral", "negative", "urgent"])
  .describe("Overall sentiment or tone of the thread");

export const ThreadSummarySchema = z.object({
  threadId: z.string().describe("Unique identifier for the thread"),
  subject: z.string().describe("Email subject line"),
  participants: z.array(z.string()).describe("List of key participants in the thread"),
  summary: z.string().describe("Concise 2-3 sentence summary of the thread"),
  keyPoints: z.array(z.string()).max(5).describe("Array of important points (max 5)"),
  actionItems: z.array(ActionItemSchema).describe("Specific tasks or next steps"),
  decisions: z.array(z.string()).describe("Key decisions or conclusions reached"),
  status: ThreadStatusSchema,
  priority: PrioritySchema,
  sentiment: SentimentSchema,
  tags: z.array(z.string()).describe('Relevant categories (e.g., "project-alpha", "budget")'),
  importantDates: z.array(ImportantDateSchema).describe("Time-sensitive dates and deadlines"),
  requiresResponse: z.boolean().describe("Whether this thread needs a reply from the user"),
  lastMessageDate: z.string().describe("ISO format date of the last message"),
});

export const FilteredMetricsSchema = z.object({
  totalThreads: z.number().int().describe("Total number of threads received"),
  processedThreads: z.number().int().describe("Number of threads summarized"),
  filteredThreads: z.number().int().describe("Number of promotional/noise threads excluded"),
});

/**
 * @description Zod Schema for a create Summary of mail threads.
 * It validates the structure and types of the data returned by the SummariseThreadsAgent.
 */
// Main output schema
export const EmailSummariesSchema = z.object({
  summaries: z.array(ThreadSummarySchema).describe("Array of summarized email threads"),
  filtered: FilteredMetricsSchema.describe("Metrics about filtering"),
});

export type EmailSummaries = z.infer<typeof EmailSummariesSchema>;
export type ThreadSummarySchema = z.infer<typeof ThreadSummarySchema>;
