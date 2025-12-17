"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

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

  return (
    <Card className="transition-all duration-200 px-4 py-6">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-start gap-2">
              <div className="mt-1 shrink-0">{statusIcons[summary.status]}</div>
              <CardTitle className="text-base line-clamp-2">
                {summary.subject}
              </CardTitle>
            </div>
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
                sentimentColors[
                  summary.sentiment as keyof typeof sentimentColors
                ]
              }`}
            >
              {summary.sentiment}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {summary.summary}
          </p>
        </div>

        {/* Key Points */}
        {summary.keyPoints.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Key Points
            </p>
            <ul className="text-xs space-y-1">
              {summary.keyPoints.slice(0, 2).map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <span className="text-muted-foreground line-clamp-2">
                    {point}
                  </span>
                </li>
              ))}
              {summary.keyPoints.length > 2 && (
                <li className="text-xs text-blue-600 dark:text-blue-400">
                  +{summary.keyPoints.length - 2} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {summary.actionItems.length > 0 && (
          <div className="space-y-2 border-t pt-3">
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
                  {/* <input
                    type="checkbox"
                    checked={item.isCompleted}
                    readOnly
                    className="mt-1 flex-shrink-0"
                  /> */}
                  
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
        )}

        {/* Participants & Tags */}
        <div className="space-y-2 pt-2 w-full flex flex-wrap">
          {summary.participants.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {summary.participants.slice(0, 2).map((participant) => (
                <Badge key={participant} variant="outline" className="text-xs">
                  {participant}
                </Badge>
              ))}
            </div>
          )}

          {summary.tags.length > 0 && (
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
          )}
        </div>

        {/* Requires Response */}
        {summary.requiresResponse && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2">
            <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
              ⚠️ Response Required
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
