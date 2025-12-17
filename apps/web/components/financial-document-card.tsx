"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const paymentStatusColors = {
  paid: "bg-green-500/10 text-green-700 dark:text-green-400",
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  overdue: "bg-red-500/10 text-red-700 dark:text-red-400",
  partial: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  refunded: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  cancelled: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

const priorityColors = {
  critical: "bg-red-500/10 text-red-700 dark:text-red-400",
  high: "bg-red-500/10 text-red-700 dark:text-red-400",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

const documentTypeLabels: Record<string, string> = {
  invoice: "Invoice",
  bill: "Bill",
  receipt: "Receipt",
  payment_confirmation: "Payment Confirmation",
  refund: "Refund",
  statement: "Statement",
  subscription: "Subscription",
  booking: "Booking",
  tax_document: "Tax Document",
  purchase_order: "Purchase Order",
  utility_payment: "Utility Payment",
  other: "Other",
};

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "Invalid date";
  }
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function FinancialDocumentCard({
  document,
}: {
  document: Record<string, unknown>;
}) {
  // Safe property access with defaults
  const amount = (document?.amount as number) ?? 0;
  const currency = ((document?.currency as string) ?? "USD");
  const merchantName = ((document?.merchant as Record<string, unknown>)?.name as string) ?? "Unknown Merchant";
  const paymentStatus = ((document?.paymentStatus as string) ?? "pending") as keyof typeof paymentStatusColors;
  const documentType = ((document?.documentType as string) ?? "other") as keyof typeof documentTypeLabels;
  const priority = ((document?.priority as string) ?? "medium") as keyof typeof priorityColors;
  const confidenceScore = (document?.confidenceScore as number) ?? 0;
  const emailDate = ((document?.emailDate as string) ?? new Date().toISOString());
  const description = ((document?.description as string) ?? "No description");
  const tags = ((document?.tags as string[]) ?? []);
  const notes = ((document?.notes as string) ?? null);
  const requiresAction = (document?.requiresAction as boolean) ?? false;
  const isRecurring = (document?.isRecurring as boolean) ?? false;
  const dueDate = ((document?.dueDate as string) ?? null);
  const category = ((document?.category as string) ?? "Uncategorized");

  const formattedAmount = formatCurrency(amount, currency);
  const formattedDate = formatDate(emailDate);
  const confidencePercentage = Math.round(confidenceScore);

  // Determine if payment is overdue
  const isOverdue =
    paymentStatus === "overdue" ||
    (paymentStatus === "pending" && dueDate && new Date(dueDate) < new Date());

  return (
    <TooltipProvider>
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base line-clamp-2">
                  {merchantName}
                </CardTitle>
                {requiresAction && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>Requires action</TooltipContent>
                  </Tooltip>
                )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {description}
            </p>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>

          <div className="flex flex-col gap-2 items-end">
            <div className="text-right">
              <p className="text-lg font-semibold">{formattedAmount}</p>
              <p className="text-xs text-muted-foreground">
                {documentTypeLabels[documentType] || "Other"}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Status and Priority Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className={`text-xs ${
              paymentStatusColors[
                paymentStatus as keyof typeof paymentStatusColors
              ] || paymentStatusColors.pending
            }`}
          >
            {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
          </Badge>

          <Badge
            variant="secondary"
            className={`text-xs ${
              priorityColors[priority as keyof typeof priorityColors]
            }`}
          >
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </Badge>

          {isRecurring && (
            <Badge variant="secondary" className="text-xs">
              🔄 Recurring
            </Badge>
          )}

          {isOverdue && (
            <Badge
              variant="secondary"
              className="text-xs bg-red-500/10 text-red-700 dark:text-red-400"
            >
              ⚠️ Overdue
            </Badge>
          )}
        </div>

        {/* Category and Tags */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {category}
          </Badge>
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Confidence Score and Due Date */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-muted-foreground">Confidence:</span>
            <span className="font-medium">{confidencePercentage}%</span>
          </div>

          {dueDate && (
            <div className="text-right">
              <span className="text-muted-foreground">Due: </span>
              <span
                className={`font-medium ${
                  isOverdue ? "text-red-600 dark:text-red-400" : ""
                }`}
              >
                {formatDate(dueDate)}
              </span>
            </div>
          )}
        </div>

        {/* Notes with warning icon if present */}
        {notes && (
          <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground line-clamp-2">
                {notes}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
