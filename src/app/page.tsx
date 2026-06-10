"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { QuizSetup } from "@/components/QuizSetup";
import { ChatWindow } from "@/components/ChatWindow";
import { ChatInput } from "@/components/ChatInput";
import { ScoreBadge } from "@/components/ScoreBadge";
import { useSession } from "@/hooks/useSession";
import { useChat } from "@/hooks/useChat";
import { RotateCcw } from "lucide-react";

export default function Home() {
  const { sessionId, newSession } = useSession();
  const { messages, sendMessage, isLoading, score, clearMessages, initializeFromSession } =
    useChat(sessionId);
  const [quizReady, setQuizReady] = useState(false);
  const [restoring, setRestoring] = useState(true);

  // 세션 복원: sessionId 확정 후 기존 대화 이력 로드
  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}`, {
          headers: { "x-session-id": sessionId },
        });
        if (res.ok) {
          const data = await res.json() as {
            messages: { role: "user" | "assistant"; content: string; timestamp: string }[];
            score: number;
          };
          if (data.messages.length > 0) {
            initializeFromSession(data.messages, data.score);
            setQuizReady(true);
          }
        }
      } finally {
        setRestoring(false);
      }
    })();
  }, [sessionId]);

  const handleQuizStart = (category: string, difficulty: string) => {
    const greeting = `${category} 카테고리, ${difficulty} 난이도로 퀴즈를 시작해줘. 반드시 아래 형식으로만 출제해줘. 보기는 정확히 1, 2, 3번 세 개만 사용하고 4번은 절대 쓰지 마.

형식 예시:
[문제 내용]
1. [보기1]
2. [보기2]
3. [보기3]

바로 첫 번째 문제를 출제해줘.`;
    setQuizReady(true);
    sendMessage(greeting, "quiz", true);
  };

  const handleRestart = () => {
    newSession();
    clearMessages();
    setQuizReady(false);
  };

  if (restoring) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <span className="font-semibold text-sm">퀴즈마스터</span>
        <div className="flex items-center gap-2">
          {quizReady && <ScoreBadge score={score} />}
          {quizReady && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRestart}
              className="h-8 w-8 text-muted-foreground"
              title="새 게임 시작"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </header>

      <main className="flex flex-col flex-1 overflow-hidden px-4 pb-4">
        {!quizReady ? (
          <QuizSetup onStart={handleQuizStart} />
        ) : (
          <>
            <ChatWindow messages={messages} isLoading={isLoading} />
            <div className="pt-3 border-t border-border">
              <ChatInput
                onSend={(msg) => sendMessage(msg, "quiz")}
                disabled={isLoading || !sessionId}
                placeholder="메시지를 입력하세요..."
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
