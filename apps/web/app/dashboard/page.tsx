"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SummaryCard } from "@/components/summary-card";
import { ThreadCard } from "@/components/thread-card";
import { FinancialDocumentCard } from "@/components/financial-document-card";
import { FinancialStatsCard } from "@/components/financial-stats-card";
import { NoiseFilterStats } from "@/components/noise-filter-stats";
import { ReportGridSkeleton } from "@/components/skeleton-loaders";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useSWR from "swr";
import { authClient } from "@/lib/auth-client";

interface ActionItem {
  action: string;
  owner?: string;
  dueDate?: string | null;
  isCompleted: boolean;
  sourceEmailSubject: string;
}

interface ThreadSummary {
  threadId: string;
  subject: string;
  participants: string[];
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  decisions: string[];
  status:
    | "action_required"
    | "awaiting_response"
    | "resolved"
    | "informational";
  priority: "high" | "medium" | "low";
  sentiment: "urgent" | "positive" | "neutral" | "negative";
  tags: string[];
  requiresResponse: boolean;
  lastMessageDate: string;
}

interface Thread {
  id: string;
  snippet: string;
  historyId: string;
}

interface FinancialDocument {
  documentId: string;
  documentType: string;
  amount: number;
  currency: string;
  transactionId: string | null;
  transactionDate: string;
  dueDate: string | null;
  paymentStatus: string;
  merchant: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    taxId: string | null;
  };
  recipient: {
    name: string | null;
    email: string | null;
    address: string | null;
  };
  lineItems: Array<{
    description: string;
    quantity: number | null;
    unitPrice: number | null;
    totalPrice: number;
    taxAmount: number | null;
  }>;
  taxDetails: {
    taxAmount: number | null;
    taxRate: number | null;
    taxType: string | null;
    taxBreakdown: Array<{
      type: string;
      amount: number;
    }>;
  };
  paymentMethod: string | null;
  paymentReference: string | null;
  category: string;
  tags: string[];
  emailSubject: string;
  emailDate: string;
  merchantDomain: string | null;
  description: string;
  notes: string | null;
  confidenceScore: number;
  verificationMarkers: string[];
  requiresAction: boolean;
  isRecurring: boolean;
  priority: "critical" | "high" | "medium" | "low";
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const baseUri = process.env.NEXT_PUBLIC_SERVER_URL;
  const [activeTab, setActiveTab] = useState("summaries");
  const { data: sessionData, isPending: isSessionPending } =
    authClient.useSession();

  const userId = sessionData?.user?.id;

  // Fetch summaries
  const {
    data: summariesData,
    error: summariesError,
    isLoading: isSummariesLoading,
  } = useSWR(
    userId && baseUri ? `${baseUri}/report/${userId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  // Fetch threads
  const {
    data: threadsData,
    error: threadsError,
    isLoading: isThreadsLoading,
  } = useSWR(
    userId && baseUri ? `${baseUri}/users/${userId}/inbox` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  // Fetch financial reports
  const {
    data: financialData,
    error: financialError,
    isLoading: isFinancialLoading,
  } = useSWR(
    userId && baseUri ? `${baseUri}/financial/${userId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const summaries = (summariesData?.summaries as ThreadSummary[]) || [];
  const filteredStats = summariesData?.filtered || {
    totalThreads: 0,
    processedThreads: 0,
    filteredThreads: 0,
  };
  const threads = (threadsData as Thread[]) || [];
  const financialDocuments =
    (financialData?.financialDocuments as FinancialDocument[]) || [];
  const financialMetadata = financialData?.metadata || {
    totalThreads: 0,
    documentsFound: 0,
    totalAmount: 0,
    currency: "USD",
    promotionalFiltered: 0,
    dateRange: { earliest: null, latest: null },
    categoryBreakdown: {},
  };
  const financialWarnings = (financialData?.warnings || []) as Array<{
    type: string;
    documentId: string;
    message: string;
  }>;

  const isLoading =
    isSessionPending ||
    isSummariesLoading ||
    isThreadsLoading ||
    isFinancialLoading;
  const error = summariesError || threadsError;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4 z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
        </header>

        <div className="flex-1 flex flex-col gap-4 p-4 md:p-6 w-full max-w-xl mx-auto">
          <div className="flex flex-col gap-1">
            <h1 className=" font-medium tracking-tight">
              Email Intelligence Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-powered summaries and insights from your email threads
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg border border-destructive/20">
              Failed to load data. Please try again.
            </div>
          )}

          {(summariesError || threadsError || financialError) && (
            <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-lg border border-amber-500/20 text-sm">
              ⚠️ Some data could not be loaded. Please refresh to try again.
            </div>
          )}

          {!userId && !isSessionPending && (
            <div className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg border border-yellow-500/20">
              Please log in to view your email intelligence dashboard.
            </div>
          )}
          {filteredStats.totalThreads > 0 && (
            <NoiseFilterStats filtered={filteredStats} />
          )}

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
            defaultValue="summaries"
          >
            <TabsList className="grid w-full grid-cols-4 group-data-horizontal/tabs:h-11 my-4 rounded-xl ">
              <TabsTrigger className=" rounded-xl" value="summaries">
                Summaries
              </TabsTrigger>
              <TabsTrigger className=" rounded-xl" value="financial">
                Finance
              </TabsTrigger>
              <TabsTrigger className=" rounded-xl" value="threads">
                Threads
              </TabsTrigger>
              <TabsTrigger className=" rounded-xl" value="analytics">
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summaries" className="space-y-4">
              <div className="grid gap-4 ">
                {isLoading ? (
                  <ReportGridSkeleton count={6} />
                ) : summaries.length > 0 ? (
                  summaries.map((summary) => (
                    <SummaryCard key={summary.threadId} summary={summary} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">No summaries found</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              {/* Financial Summary Stats */}
              {financialMetadata.documentsFound > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <FinancialStatsCard
                    label="Documents"
                    value={financialMetadata.documentsFound}
                  />
                  <FinancialStatsCard
                    label="Total Amount"
                    value={
                      financialMetadata.documentsFound > 0
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: financialMetadata.currency || "USD",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(financialMetadata.totalAmount)
                        : "—"
                    }
                    variant="success"
                  />
                  <FinancialStatsCard
                    label="Processed Threads"
                    value={financialMetadata.totalThreads}
                  />
                  <FinancialStatsCard
                    label="Filtered (Promo)"
                    value={financialMetadata.promotionalFiltered}
                    variant="accent"
                  />
                </div>
              )}

              {/* Financial Warnings */}
              {financialWarnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                      ⚠️ {financialWarnings.length} issue
                      {financialWarnings.length !== 1 ? "s" : ""} detected
                    </p>
                  </div>
                  <ul className="space-y-1 text-amber-800 dark:text-amber-300 text-xs">
                    {financialWarnings.slice(0, 3).map((warning, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                          •
                        </span>
                        <span>
                          <strong>{warning.type}:</strong> {warning.message}
                        </span>
                      </li>
                    ))}
                    {financialWarnings.length > 3 && (
                      <li className="text-amber-700 dark:text-amber-400 font-medium">
                        → +{financialWarnings.length - 3} more warning
                        {financialWarnings.length - 3 !== 1 ? "s" : ""}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Category Breakdown */}
              {Object.keys(financialMetadata.categoryBreakdown).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(financialMetadata.categoryBreakdown).map(
                    ([category, count]) => (
                      <div
                        key={category}
                        className="border rounded-lg p-3 bg-card/50 hover:bg-card transition-colors"
                      >
                        <p className="text-xs text-muted-foreground mb-1 truncate">
                          {category}
                        </p>
                        <p className="text-lg font-semibold">{String(count)}</p>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Financial Documents Grid */}
              <div className="space-y-2">
                {financialDocuments.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Financial Documents</p>
                    <p className="text-xs text-muted-foreground">
                      {financialDocuments.length} document
                      {financialDocuments.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
                <div className="grid gap-4">
                  {isLoading ? (
                    <ReportGridSkeleton count={6} />
                  ) : financialDocuments.length > 0 ? (
                    financialDocuments.map((doc) => (
                      <FinancialDocumentCard
                        key={doc.documentId}
                        document={doc as unknown as Record<string, unknown>}
                      />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <p className="text-muted-foreground text-sm">
                        {financialMetadata.totalThreads > 0
                          ? "No financial documents found in your emails"
                          : "No email threads to analyze for financial documents"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="threads" className="space-y-4">
              <div className="grid gap-4  max-w-3xl mx-auto">
                {isLoading ? (
                  <ReportGridSkeleton count={6} />
                ) : threads.length > 0 ? (
                  threads.map((thread) => (
                    <ThreadCard key={thread.id} thread={thread} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground">No threads found</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
