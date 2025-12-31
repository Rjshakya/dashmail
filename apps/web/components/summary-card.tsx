"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, ChevronsUpDown } from "lucide-react";
import { Separator } from "./ui/separator";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

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

const statusIcons = {
  action_required: <AlertCircle className="w-4 h-4" />,
  awaiting_response: <Clock className="w-4 h-4" />,
  resolved: <CheckCircle2 className="w-4 h-4" />,
  informational: <AlertCircle className="w-4 h-4" />,
};

const statusColors = {
  action_required: "bg-red-500/10 text-red-700 dark:text-red-400",
  awaiting_response: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-400",
  informational: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

const sentimentColors = {
  urgent: "bg-red-500/10 text-red-700 dark:text-red-400",
  positive: "bg-green-500/10 text-green-700 dark:text-green-400",
  neutral: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  negative: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

const priorityColors = {
  high: "bg-red-500/10 text-red-700 dark:text-red-400",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function SummaryCard({ summary }: { summary: ThreadSummary }) {
  const formattedDate = formatDate(summary?.lastMessageDate);
  const [expandKeyPoints, setExpandKeyPoints] = useState(false);
  const [expand, setExpand] = useState(false);

  return (
    <Card
      onClick={() => setExpand(!expand)}
      className={`bg-muted transition-all duration-200 my-2 border-2 ring-0 cursor-pointer ${expand ? "py-4" : "pb-0 pt-4"}`}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col items-start justify-between gap-1">
          <div className=" flex items-center justify-between w-full gap-2 ">
            <div>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className={`text-xs ${
                  priorityColors[summary.priority as keyof typeof priorityColors]
                }`}
              >
                {summary.priority}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-xs ${
                  sentimentColors[summary.sentiment as keyof typeof sentimentColors]
                }`}
              >
                {summary.sentiment}
              </Badge>
              <Badge
                className="size-5 grid place-content-center cursor-pointer select-auto active:translate-y-0.5 transition-all duration-300 ease-in-out"
                onClick={() => setExpand(!expand)}
              >
                <ChevronsUpDown className="size-2" />
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 w-full">
            <CardTitle className="text-base line-clamp-2 text-balance font-medium w-full  ">
              <p className=" max-w-xs">{summary.subject}</p>
            </CardTitle>

            {/* <div className="">{statusIcons[summary.status]}</div> */}
          </div>
        </div>
      </CardHeader>

      <CardContent className="">
        <motion.div layout className="grid gap-3">
          <AnimatePresence>
            {expand && (
              <motion.div
                layout
                key="expanded-content" // Unique key for the expansion block
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={`grid gap-3`}
              >
                {/* Summary */}
                <motion.div layout>
                  <p className="text-sm text-muted-foreground">{summary.summary}</p>
                </motion.div>

                {/* Key Points */}
                {summary.keyPoints.length > 0 && (
                  <motion.div layout className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Key Points</p>
                    <motion.ul layout className="text-xs space-y-1">
                      <AnimatePresence>
                        {summary.keyPoints
                          .slice(0, expandKeyPoints ? summary.keyPoints.length : 2)
                          .map((point, idx) => (
                            <motion.li
                              layout // Smoothly moves the item to its new position
                              key={idx} // Use 'point' or a unique ID instead of 'idx' for better layout stability
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{
                                duration: 0.2,
                                ease: "easeInOut",
                              }}
                              className="flex items-start gap-2"
                            >
                              <span className="text-muted-foreground mt-1">•</span>
                              <span className="text-muted-foreground line-clamp-2">{point}</span>
                            </motion.li>
                          ))}
                      </AnimatePresence>
                      {summary.keyPoints.length > 2 && (
                        <motion.li
                          onClick={() => setExpandKeyPoints(!expandKeyPoints)}
                          className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer"
                        >
                          {expandKeyPoints ? "close" : `+${summary.keyPoints.length - 2} more`}
                        </motion.li>
                      )}
                    </motion.ul>
                  </motion.div>
                )}

                {/* Action Items */}
                {/* {summary.actionItems.length > 0 && (
          <>
            <Separator />

            <div className="space-y-2  pt-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Action Items ({summary.actionItems.length})
              </p>
              <ul className="text-xs space-y-2">
                {summary.actionItems.map((item, idx) => (
                  <li
                    key={idx}
                    className={`flex items-start gap-2 p-2 rounded-md ${
                      item.isCompleted
                        ? "bg-green-500/5 opacity-60"
                        : "bg-orange-500/5"
                    }`}
                  >

                    <span
                      className={
                        item.isCompleted
                          ? "line-through text-muted-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      ⚠️ {item.action}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )} */}

                <Separator />
                {/* Participants */}
                {/* <div className="space-y-2 pt-2 w-full">
          {summary.participants.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground">
                Participants
              </p>
              <div className="flex flex-wrap gap-1">
                {summary.participants.slice(0, 2).map((participant) => (
                  <Badge
                    key={participant}
                    variant="outline"
                    className="text-xs"
                  >
                    {participant}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div> */}

                {/* <Separator /> */}

                {/*  Tags */}
                <div className="space-y-2  w-full ">
                  {summary.tags.length > 0 && (
                    <>
                      <div className=" flex flex-wrap gap-1">
                        {summary.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {summary.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{summary.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Requires Response */}
                {summary.requiresResponse && (
                  <>
                    {/* <Separator /> */}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2">
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                        ⚠️ Response Required
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </CardContent>
    </Card>
  );
}
