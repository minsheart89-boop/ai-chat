"use client";

import { Badge } from "@/components/ui/badge";

type Props = {
  score: number;
};

export function ScoreBadge({ score }: Props) {
  return (
    <Badge variant="secondary" className="tabular-nums font-mono text-xs px-2.5">
      ⭐ {score}점
    </Badge>
  );
}
