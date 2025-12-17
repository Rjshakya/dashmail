"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";

interface FilteredStats {
  totalThreads: number;
  processedThreads: number;
  filteredThreads: number;
}

export function NoiseFilterStats({ filtered }: { filtered: FilteredStats }) {
  const filterPercentage = Math.round(
    (filtered.filteredThreads / filtered.totalThreads) * 100
  );
  const processedPercentage = Math.round(
    (filtered.processedThreads / filtered.totalThreads) * 100
  );

  return (
    <Card className="">
      <CardContent className="">
        <div className="space-y-12">
          <div className="flex items-start gap-2">
            {/* <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 shrink-0" /> */}
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                Inbox Noise Filtered
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Only Relevant things from your mail box
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-white/50 dark:bg-black/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">
                {filtered.totalThreads}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total</p>
            </div>

            <div className="bg-blue-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {filtered.processedThreads}
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                Summarized
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-500/70">
                ({processedPercentage}%)
              </p>
            </div>

            <div className="bg-orange-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {filtered.filteredThreads}
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                Filtered
              </p>
              <p className="text-xs text-orange-600/70 dark:text-orange-500/70">
                ({filterPercentage}%)
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
