"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["역사", "과학", "문화", "스포츠", "상식"];
const DIFFICULTIES = ["쉬움", "보통", "어려움"];

type Props = {
  onStart: (category: string, difficulty: string) => void;
};

export function QuizSetup({ onStart }: Props) {
  const [category, setCategory] = useState<string | null>(null);

  if (!category) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-6 py-8">
        <p className="text-sm font-medium text-foreground">카테고리를 선택하세요</p>
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant="outline"
              className="min-w-20"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-6 py-8">
      <p className="text-sm text-muted-foreground">
        카테고리: <span className="font-medium text-foreground">{category}</span>
      </p>
      <p className="text-sm font-medium text-foreground">난이도를 선택하세요</p>
      <div className="flex gap-2">
        {DIFFICULTIES.map((diff) => (
          <Button
            key={diff}
            variant="outline"
            className="min-w-20"
            onClick={() => onStart(category, diff)}
          >
            {diff}
          </Button>
        ))}
      </div>
    </div>
  );
}
