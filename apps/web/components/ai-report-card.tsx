"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AIReport {
  threadId: string;
  title?: string;
  summary?: string;
  sentiment?: "positive" | "negative" | "neutral";
  actionItems?: string[];
  tags?: string[];
  priority?: "high" | "medium" | "low";
}

const sentimentColors = {
  positive: "bg-green-500/10 text-green-700 dark:text-green-400",
  negative: "bg-red-500/10 text-red-700 dark:text-red-400",
  neutral: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

const priorityColors = {
  high: "bg-red-500/10 text-red-700 dark:text-red-400",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

export function AIReportCard({ report }: { report: AIReport }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-base line-clamp-2">
              {report.title || "AI Report"}
            </CardTitle>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {report.sentiment && (
              <Badge
                variant="secondary"
                className={`text-xs ${
                  sentimentColors[report.sentiment as keyof typeof sentimentColors]
                }`}
              >
                {report.sentiment}
              </Badge>
            )}
            {report.priority && (
              <Badge
                variant="secondary"
                className={`text-xs ${
                  priorityColors[report.priority as keyof typeof priorityColors]
                }`}
              >
                {report.priority}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {report.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {report.summary}
          </p>
        )}

        {report.actionItems && report.actionItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Action Items
            </p>
            <ul className="text-sm space-y-1">
              {report.actionItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.tags && report.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {report.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
