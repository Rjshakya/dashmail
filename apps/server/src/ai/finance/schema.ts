import { z } from "zod/v3";

const FinancialDocumentSchema = z.object({
  documentId: z.string().describe("It can be a thread id"),
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

  // Flags
  requiresAction: z.boolean(),
  isRecurring: z.boolean(),
  priority: z.enum(["critical", "high", "medium", "low"]),
});

/**
 * @description zod schema for a FinancialAgent
 */
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
});

export const Report = z.object({});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;
export type financialDocument = z.infer<typeof FinancialDocumentSchema>