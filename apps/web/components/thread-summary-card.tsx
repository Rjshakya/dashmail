"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Message {
  subject?: string;
  date?: string;
  from?: string;
}

interface ThreadSummary {
  threadId: string;
  messageCount: number;
  subject?: string;
  lastMessageDate?: string;
  summary?: string;
  labels?: string[];
  messages?: Message[];
}

function formatRelativeDate(dateString?: string): string {
  if (!dateString) return "Unknown";

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

export function ThreadSummaryCard({ thread }: { thread: ThreadSummary }) {
  const lastDate = formatRelativeDate(thread.lastMessageDate);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-base line-clamp-2">
              {thread.subject || "No Subject"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{lastDate}</p>
          </div>
          <Badge variant="secondary" className="ml-2">
            {thread.messageCount || 1} message{thread.messageCount !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      {(thread.summary || thread.labels) && (
        <CardContent className="space-y-3">
          {thread.summary && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {thread.summary}
            </p>
          )}
          {thread.labels && thread.labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {thread.labels.map((label) => (
                <Badge key={label} variant="outline" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
