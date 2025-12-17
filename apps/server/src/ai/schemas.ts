import { z } from "zod";

// ACTION-SCHEMA

const InvoiceLineItemSchema = z.object({
  description: z
    .string()
    .describe("A brief description of the product or service."),
  quantity: z.number().describe("The number of units."),
  unitPrice: z.number().describe("The price per unit."),
  lineTotal: z
    .number()
    .describe("The calculated total for this line (quantity * unitPrice)."),
});

// MAIN
export const InvoiceSchema = z.object({
  invoiceNumber: z
    .string()
    .describe("The unique identifier for the invoice (e.g., INV-2023-1001)."),
  vendorName: z
    .string()
    .describe("The company or person who issued the invoice."),
  customerName: z
    .string()
    .describe("The company or person who is receiving the invoice."),
  invoiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .describe("The date the invoice was issued (YYYY-MM-DD format)."),
  dueDate: z
    .string()
    .nullable()
    .describe(
      "The date the payment is due (YYYY-MM-DD) or 'null' if not specified."
    ),
  paymentTerms: z
    .string()
    .nullable()
    .describe("The payment terms (e.g., 'Net 30', 'Due on Receipt')."),
  lineItems: z
    .array(InvoiceLineItemSchema)
    .describe("A list of all individual products or services billed."),
  subTotal: z.number().describe("The total cost before tax and discounts."),
  taxAmount: z.number().default(0).describe("The total amount of tax applied."),
  grandTotal: z
    .number()
    .describe("The final amount due, including tax and discounts."),
  currency: z
    .string()
    .length(3)
    .default("USD")
    .describe("The 3-letter currency code (e.g., USD, EUR)."),
});

// ACTION-DECISIONS

export const ActionItemSchema = z.object({
  action: z
    .string()
    .describe(
      "The specific task that needs to be done (e.g., 'Draft the final contract', 'Send revised budget to Finance')."
    ),
  owner: z
    .string()
    .describe("The name of the person responsible for completing the task."),
  dueDate: z
    .string()
    .nullable()
    .describe(
      "The specific date the task is due (YYYY-MM-DD), 'null' if unspecified."
    ),
  isCompleted: z
    .boolean()
    .default(false)
    .describe(
      "True if the thread implies the task was completed, otherwise False."
    ),
  sourceEmailSubject: z
    .string()
    .describe(
      "The subject of the email where the action was assigned/committed."
    ),
});

export const KeyDecisionSchema = z.object({
  decisionSummary: z
    .string()
    .describe(
      "A concise summary of the final agreement or decision made (e.g., 'We will move forward with Proposal B.', 'Project launch is postponed to Q1 2026')."
    ),
  dateAgreed: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .describe("The date the decision was explicitly made (YYYY-MM-DD)."),
  threadParticipants: z
    .array(z.string())
    .describe("List of key participants involved in the decision."),
});

// MAIN
export const ThreadIntelligenceSchema = z.object({
  threadSummary: z
    .string()
    .max(300)
    .describe(
      "A 1-2 sentence high-level summary of the entire thread's purpose and outcome."
    ),
  actionItems: z
    .array(ActionItemSchema)
    .describe(
      "A list of all outstanding or completed action items/tasks mentioned."
    ),
  keyDecisions: z
    .array(KeyDecisionSchema)
    .describe(
      "A list of all important business decisions or agreements reached."
    ),
});

// THREAD-ANALYTICS

export const PrimaryCategory = z.enum([
  "Product_Inquiry",
  "Technical_Support",
  "Billing_Invoice",
  "Account_Access",
  "Feature_Request",
  "Sales_Lead",
  "General_Feedback",
  "Promotional",
  "Likely Spam",
]);

export const ResolutionStatus = z.enum([
  "Resolved_Full",
  "Resolved_Partial",
  "Pending_Customer_Response",
  "Pending_Internal_Escalation",
  "Unresolved_Stale",
  "Spam_Other",
]);
// MAIN
export const OperationalAnalyticsSchema = z.object({
  // --- Time-based Metrics ---
  threadID: z.string().describe("The unique identifier for the email thread."),
  firstCustomerInboundTime: z
    .string()
    .datetime({ message: "Must be a valid ISO 8601 timestamp." })
    .describe("Timestamp of the very first customer email in the thread."),
  firstAgentReplyTime: z
    .string()
    .datetime({ message: "Must be a valid ISO 8601 timestamp." })
    .nullable()
    .describe(
      "Timestamp of the first reply sent by an internal team member/agent."
    ),
  lastActivityTime: z
    .string()
    .datetime({ message: "Must be a valid ISO 8601 timestamp." })
    .describe("Timestamp of the most recent email in the thread."),

  // --- Classification & Status ---
  primaryCategory: PrimaryCategory.describe(
    "The core subject of the thread, selected from the enum list."
  ),
  secondaryCategory: PrimaryCategory.nullable().describe(
    "An optional secondary topic if applicable, 'null' otherwise."
  ),
  resolutionStatus: ResolutionStatus.describe(
    "The current state of the thread, selected from the enum list."
  ),

  // --- Agent & Customer Data ---
  initialReporterEmail: z
    .string()
    .email()
    .describe("The email address of the person who started the thread."),
  handlingAgentEmail: z
    .string()
    .email()
    .nullable()
    .describe(
      "The email of the primary agent who handled the thread, or 'null'."
    ),
});

export const ClassificationSchema = z.object({
  classification: z.union([
    z.literal("A"), // Promotional/Sales
    z.literal("B"), // Spam/Malicious
    z.literal("C"), // Legitimate/Operational
    z.literal("D"), // Company Operational Email
  ]),

  category_name: z.union([
    z.literal("Promotional/Sales"),
    z.literal("Spam/Malicious"),
    z.literal("Legitimate/Operational"),
    z.literal("Company Operational Email"),
  ]),

  rationale: z.string("reasoning for your output"),
  shouldSkipthisThread: z.boolean(),
});

/**
 * @description Zod Schema for a single extracted financial document (invoice or bill).
 * It validates the structure and types of the data returned by the InvoiceAgentSystemPrompt.
 */
export const InvoiceSchema2 = z.object({
  // The name of the entity sending the bill (e.g., "AWS", "Uber").
  sender: z.string("Sender").nonempty({ message: "Sender cannot be empty." }),

  // The total numerical value. Parsed as a number, allowing for two decimal places.
  amount: z.number("Amount must be a positive number."),

  // The currency symbol or code (e.g., "USD", "$", "EUR").
  currency: z.string().nonempty({ message: "Currency cannot be empty." }),

  // The date of the invoice/transaction (YYYY-MM-DD format).
  // Can be null if the date is not explicitly found in the thread.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.")
    .nullable(),

  // The invoice number, order ID, or reference number.
  // Can be null if the ID is not explicitly found.
  invoice_id: z.string().nullable(),

  // A brief 2-5 word summary of what was paid for.
  description: z
    .string()
    .min(2, { message: "Description must be at least 2 characters." })
    .nullable(),

  // Infer the status: "PAID" (receipts), "DUE" (unpaid bills), or "OVERDUE".
  status: z.enum(["PAID", "DUE", "OVERDUE"]),
});

/**
 * @description Zod Schema for the final output array, which is a batch of Invoice objects.
 */
export const InvoiceAgentOutputSchema = z.array(InvoiceSchema);
export type InvoiceAgentOutputSchema = z.infer<typeof InvoiceAgentOutputSchema>;

// Action item schema
export const ActionItemSchema2 = z.object({
  task: z.string().describe("Specific task or next step"),
  assignee: z.string().nullable().describe("Person responsible for the task"),
  dueDate: z.string().nullable().describe("ISO format date or null"),
  completed: z.boolean().describe("Whether the task is completed"),
});

// Important date schema
export const ImportantDateSchema = z.object({
  date: z.string().describe("ISO format date"),
  description: z.string().describe("What the date represents"),
});

// Thread status enum
export const ThreadStatusSchema = z
  .enum(["resolved", "pending", "action_required", "informational"])
  .describe("Current status of the email thread");

// Priority level enum
export const PrioritySchema = z
  .enum(["high", "medium", "low"])
  .describe("Priority level of the thread");

// Sentiment enum
export const SentimentSchema = z
  .enum(["positive", "neutral", "negative", "urgent"])
  .describe("Overall sentiment or tone of the thread");

// Individual thread summary schema
export const ThreadSummarySchema = z.object({
  threadId: z.string().describe("Unique identifier for the thread"),
  subject: z.string().describe("Email subject line"),
  participants: z
    .array(z.string())
    .describe("List of key participants in the thread"),
  summary: z.string().describe("Concise 2-3 sentence summary of the thread"),
  keyPoints: z
    .array(z.string())
    .max(5)
    .describe("Array of important points (max 5)"),
  actionItems: z
    .array(ActionItemSchema)
    .describe("Specific tasks or next steps"),
  decisions: z
    .array(z.string())
    .describe("Key decisions or conclusions reached"),
  status: ThreadStatusSchema,
  priority: PrioritySchema,
  sentiment: SentimentSchema,
  tags: z
    .array(z.string())
    .describe('Relevant categories (e.g., "project-alpha", "budget")'),
  importantDates: z
    .array(ImportantDateSchema)
    .describe("Time-sensitive dates and deadlines"),
  requiresResponse: z
    .boolean()
    .describe("Whether this thread needs a reply from the user"),
  lastMessageDate: z.string().describe("ISO format date of the last message"),
});

// Filtering metrics schema
export const FilteredMetricsSchema = z.object({
  totalThreads: z.number().int().describe("Total number of threads received"),
  processedThreads: z.number().int().describe("Number of threads summarized"),
  filteredThreads: z
    .number()
    .int()
    .describe("Number of promotional/noise threads excluded"),
});

/**
 * @description Zod Schema for a create Summary of mail threads.
 * It validates the structure and types of the data returned by the SummariseThreadsAgent.
 */
// Main output schema
export const EmailSummariesSchema = z.object({
  summaries: z
    .array(ThreadSummarySchema)
    .describe("Array of summarized email threads"),
  filtered: FilteredMetricsSchema.describe("Metrics about filtering"),
});

/**
 * @description zod schema for a FinancialAgent
 */
const FinancialDocumentSchema = z.object({
  documentId: z.string("It can be a thread id"),
  documentType: z.enum([
    "invoice",
    "bill",
    "receipt",
    "payment_confirmation",
    "refund",
    "statement",
    "subscription",
    "booking",
    "tax_document",
    "purchase_order",
    "utility_payment",
    "other",
  ]),

  // Core Financial Data
  amount: z.number(),
  currency: z.string(), // ISO currency code
  transactionId: z.string().nullable(),
  transactionDate: z.string(), // ISO format date
  dueDate: z.string().nullable(),
  paymentStatus: z.enum([
    "paid",
    "pending",
    "overdue",
    "partial",
    "refunded",
    "cancelled",
  ]),

  // Entity Information
  merchant: z.object({
    name: z.string(),
    email: z.string().email().nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    taxId: z.string().nullable(),
  }),

  recipient: z.object({
    name: z.string().nullable(),
    email: z.string().email().nullable(),
    address: z.string().nullable(),
  }),

  // Itemization
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().nullable(),
      unitPrice: z.number().nullable(),
      totalPrice: z.number(),
      taxAmount: z.number().nullable(),
    })
  ),

  // Tax Information
  taxDetails: z.object({
    taxAmount: z.number().nullable(),
    taxRate: z.number().nullable(),
    taxType: z.string().nullable(),
    taxBreakdown: z.array(
      z.object({
        type: z.string(),
        amount: z.number(),
      })
    ),
  }),

  // Payment Information
  paymentMethod: z.string().nullable(),
  paymentReference: z.string().nullable(),

  // Additional Metadata
  category: z.string(),
  tags: z.array(z.string()),
  emailSubject: z.string(),
  emailDate: z.string(),
  merchantDomain: z.string().nullable(),

  // Extracted Text
  description: z.string(),
  notes: z.string().nullable(),

  // Confidence & Verification
  confidenceScore: z.number().min(0).max(100),
  verificationMarkers: z.array(z.string()),

  // Flags
  requiresAction: z.boolean(),
  isRecurring: z.boolean(),
  priority: z.enum(["critical", "high", "medium", "low"]),
});

export const AnalysisSchema = z.object({
  financialDocuments: z.array(FinancialDocumentSchema),

  metadata: z.object({
    totalThreads: z.number(),
    documentsFound: z.number(),
    totalAmount: z.number(),
    currency: z.string(),
    promotionalFiltered: z.number(),
    dateRange: z.object({
      earliest: z.string().nullable(),
      latest: z.string().nullable(),
    }),
    categoryBreakdown: z.record(z.string(), z.number()),
  }),

  warnings: z.array(
    z.object({
      type: z.enum([
        "duplicate",
        "incomplete_data",
        "suspicious",
        "unclear_amount",
        "missing_vendor",
      ]),
      documentId: z.string(),
      message: z.string(),
    })
  ),
});

// Type exports for TypeScript
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type ImportantDate = z.infer<typeof ImportantDateSchema>;
export type ThreadStatus = z.infer<typeof ThreadStatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type Sentiment = z.infer<typeof SentimentSchema>;
export type ThreadSummary = z.infer<typeof ThreadSummarySchema>;
export type FilteredMetrics = z.infer<typeof FilteredMetricsSchema>;
export type EmailSummaries = z.infer<typeof EmailSummariesSchema>;
export type AnalysisResult = z.infer<typeof AnalysisSchema>;
