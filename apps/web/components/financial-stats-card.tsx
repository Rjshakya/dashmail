"use client";

import { Card } from "@/components/ui/card";

interface FinancialStatsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: "default" | "accent" | "success" | "warning";
}

const variantStyles = {
  default: "border-border",
  accent: "border-blue-500/20 bg-blue-500/5",
  success: "border-green-500/20 bg-green-500/5",
  warning: "border-amber-500/20 bg-amber-500/5",
};

export function FinancialStatsCard({
  label,
  value,
  icon,
  variant = "default",
}: FinancialStatsCardProps) {
  return (
    <Card className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-sm ${variantStyles[variant]}`}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {icon && <div className="text-lg">{icon}</div>}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
        </div>
        <p className="text-2xl font-bold line-clamp-1">{value}</p>
      </div>
    </Card>
  );
}
