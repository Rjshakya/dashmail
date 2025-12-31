"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SummaryCard } from "@/components/summary-card";
import { ThreadCard } from "@/components/thread-card";
import { FinancialDocumentCard } from "@/components/financial-document-card";
import { FinancialStatsCard } from "@/components/financial-stats-card";
import { NoiseFilterStats } from "@/components/noise-filter-stats";
import { ReportGridSkeleton } from "@/components/skeleton-loaders";
import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useSWR from "swr";
import { authClient } from "@/lib/auth-client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import { apiClient } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  status: "action_required" | "awaiting_response" | "resolved" | "informational";
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

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export const Dashboard = () => {
  const baseUri = process.env.NEXT_PUBLIC_SERVER_URL;
  const [activeTab, setActiveTab] = useState("Highlights");
  const { data: sessionData, isPending: isSessionPending } = authClient.useSession();

  const { data, error: getScheduleErr, isLoading: scheduleLoading } = useSWR("/schedule", fetcher);
  const [scheduleTime, setScheduleTime] = useState({
    hour: 0,
    minute: 0,
  });

  useEffect(() => {
    (async () => {
      if (data?.time?.hour && data?.time?.minute) {
        setScheduleTime({
          hour: parseInt(data.time.hour),
          minute: parseInt(data.time.minute),
        });
      }
    })();
  }, [data]);

  const before = new Date();
  const after = new Date();
  after.setDate(after.getDate() - 1);
  after.setHours(0, 0, 0, 0);
  const userId = sessionData?.user?.id;

  // Fetch summaries
  const {
    data: summariesData,
    error: summariesError,
    isLoading: isSummariesLoading,
  } = useSWR(
    userId && baseUri
      ? `${baseUri}/report/${userId}/${after.toISOString().split("T")[0]}/${before.toISOString().split("T")[0]}`
      : null,
    fetcher,
  );

  const summaries = (summariesData?.summaries as ThreadSummary[]) || [];
  const filteredStats = summariesData?.filtered || {
    totalThreads: 0,
    processedThreads: 0,
    filteredThreads: 0,
  };

  const financialDocuments = (summariesData?.financial as FinancialDocument[]) || [];

  const financialMetadata = summariesData?.metadata || {
    totalThreads: 0,
    documentsFound: 0,
    totalAmount: 0,
    currency: "USD",
    promotionalFiltered: 0,
    dateRange: { earliest: null, latest: null },
    categoryBreakdown: {},
  };

  const isLoading = isSessionPending || isSummariesLoading;
  const error = summariesError;

  const handleSchedule = useCallback(async (userId: string, time: typeof scheduleTime) => {
    return toast.promise(
      async () => {
        const hour = time.hour < 10 ? `0${time.hour}` : `${time.hour}`;
        const minute = time.minute < 10 ? `0${time.minute}` : `${time.minute}`;

        await apiClient.post("/schedule", {
          userId,
          time: { hour, minute },
        });
      },
      {
        loading: "loading...",
        success: "scheduled",
        error: "Error to schedule",
      },
    );
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 md:p-6 w-full max-w-xl mx-auto relative">
      <div className=" flex justify-between">
        <div className="flex flex-col gap-1">
          <h1 className=" font-medium tracking-tight">Gmail Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered summaries and insights from your email threads
          </p>
        </div>
        <div className="">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size={"icon"} variant={"outline"}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-5 fill-foreground"
                  viewBox="0 0 256 256"
                >
                  <path d="M144,128a16,16,0,1,1-16-16A16,16,0,0,1,144,128ZM60,112a16,16,0,1,0,16,16A16,16,0,0,0,60,112Zm136,0a16,16,0,1,0,16,16A16,16,0,0,0,196,112Z"></path>
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="m-1 w-3xs">
              <DropdownMenuLabel>Send report at </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="flex  items-center gap-2 mt-2">
                <DropdownMenuItem
                  className="focus:bg-muted focus:text-black flex-1 bg-muted py-0 px-0 "
                  onSelect={(e) => e.preventDefault()}
                >
                  <Input
                    value={`${scheduleTime.hour < 10 ? `0${scheduleTime.hour}` : scheduleTime.hour}:${scheduleTime.minute < 10 ? `0${scheduleTime.minute}` : scheduleTime.minute}`}
                    onChange={(e) => {
                      console.log(e.target.value);
                      const splited = e.target.value.split(":");
                      setScheduleTime({
                        hour: parseInt(splited[0]),
                        minute: parseInt(splited[1]),
                      });
                    }}
                    type="time"
                    className="border-0 "
                  />
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="focus:bg-accent px-2"
                  onSelect={(e) => e.preventDefault()}
                  asChild
                >
                  <Button
                    onClick={() => handleSchedule(userId!, scheduleTime)}
                    variant={"default"}
                    size={"icon"}
                    className=" py-4"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-4 fill-white"
                      viewBox="0 0 256 256"
                    >
                      <path d="M224.49,184.49l-48,48a12,12,0,0,1-17-17L187,188H72a12,12,0,0,1-12-12V32a12,12,0,0,1,24,0V164H187l-27.52-27.51a12,12,0,1,1,17-17l48,48A12,12,0,0,1,224.49,184.49Z"></path>
                    </svg>
                  </Button>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg border border-destructive/20">
          Failed to load data. Please try again.
        </div>
      )}

      {summariesError && (
        <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-lg border border-amber-500/20 text-sm">
          ⚠️ Some data could not be loaded. Please refresh to try again.
        </div>
      )}

      {!userId && !isSessionPending && (
        <div className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg border border-yellow-500/20">
          Please log in to view your email intelligence dashboard.
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full   transition-all "
        defaultValue="Highlights"
        orientation="horizontal"
      >
        {/* --- NAVIGATION --- */}
        <TabsList className=" grid w-full grid-cols-2 rounded-full border">
          {["Highlights", "Invoices"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className=" rounded-full h-9  bg-transparent transition-colors data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
            >
              <span className="capitalize text-sm font-medium relative">{tab}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* --- ANIMATED CONTENT --- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {activeTab === "Highlights" && (
              <TabsContent value="Highlights" forceMount className="mt-0">
                <ScrollArea className=" py-2">
                  {isLoading ? (
                    <ReportGridSkeleton count={6} />
                  ) : summaries.length > 0 ? (
                    summaries.map((summary) => (
                      <SummaryCard key={summary.threadId} summary={summary} />
                    ))
                  ) : (
                    <p className="py-8 px-8 text-muted-foreground">
                      {`All you have got is noise in your inbox , that's why we have nothing to show you , if you will get any important mail , we'll show you , till then just chill.`}{" "}
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>
            )}

            {activeTab === "Invoices" && (
              <TabsContent value="Invoices" forceMount className="mt-0 space-y-4">
                <div className="grid gap-2">
                  {/* Financial Metadata Stats */}
                  {financialMetadata.documentsFound > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className=" my-2 w-full"
                    >
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 my-2 w-full ">
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
                      </div>
                    </motion.div>
                  )}

                  <ScrollArea className="h-120 py-2">
                    <div className="space-y-2">
                      {financialDocuments.length > 0 && (
                        <div className="flex items-center justify-between px-1">
                          <p className="text-sm font-medium">Invoices & bills</p>
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
                                ? "No Invoices & bills are found in your emails"
                                : "No email threads to analyze for Invoices & bills"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            )}
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
};
