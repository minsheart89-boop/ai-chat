"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/game";

type Props = {
  message: ChatMessage;
};

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-foreground text-background rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {message.streaming && !message.content ? (
          <span className="flex gap-1 items-center h-4">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
          </span>
        ) : (
          <p className="whitespace-pre-wrap break-words">
            {message.content
              .replace(/[^\n。.!?]*?<function[\s\S]*?<\/function>[^\n。.!?]*?호출합니다\.?\s*/g, "")
              .replace(/<function[\s\S]*?<\/function>/g, "")
              .replace(/\S+[을를]\s*호출합니다\.?\s*/g, "")
              .replace(/[A-Za-z]{2,}/g, "")
              .replace(/[Ѐ-ӿ]+/g, "")
              .replace(/[ぁ-ゖゝ-ゟァ-ヺヽ-ヿㇰ-ㇿ]/gu, "")
              .replace(/[฀-๿]/g, "")
              .replace(/[Ḁ-ỿ]/g, "")
              .replace(/[一-鿿㐀-䶿\u{20000}-\u{2A6DF}]+[가-힣]{0,3}/gu, " ")
              .replace(/^[1-9]\.\s*$/gm, "")
              .replace(/\n{3,}/g, "\n\n")
              .replace(/[ \t]{2,}/g, " ")
              .replace(/\n[ \t]+/g, "\n")
              .trim()}
            {message.streaming && (
              <span className="inline-block w-1 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm align-middle" />
            )}
          </p>
        )}
      </div>
    </div>
  );
}
