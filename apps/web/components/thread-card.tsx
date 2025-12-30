"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";
import Link from "next/link";

interface Thread {
  id: string;
  snippet: string;
  historyId: string;
}

export function ThreadCard({ thread }: { thread: Thread }) {
  return (
    <Card className=" cursor-pointer group my-2 ring-0 border">
      <Link
        target="_blank"
        href={`https://mail.google.com/mail/u/0/#inbox/${thread.id}`}
      >
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 mt-1 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <p className="text-sm text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                {thread.snippet || "No preview available"}
              </p>
            </div>
            {/* <div className="text-xs text-muted-foreground/70">
            ID: {thread.id.slice(0, 8)}...
          </div> */}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
