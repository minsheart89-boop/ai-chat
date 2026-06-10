"use client";

import { useState, useCallback } from "react";
import type { ChatMessage, GameMode } from "@/types/game";

type DbMessage = { role: "user" | "assistant"; content: string; timestamp: string };

function parseScore(text: string): number | null {
  const match = text.match(/(?:누적|총|현재)[^。.!?\n]*?점수[는은이가]?\s*[:：]?\s*(-?\d+)\s*점/);
  if (!match) return null;
  return Math.max(0, parseInt(match[1], 10));
}

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState(0);

  const initializeFromSession = useCallback(
    (dbMessages: DbMessage[], sessionScore: number) => {
      setMessages(
        dbMessages.map((m) => ({
          id: crypto.randomUUID(),
          role: m.role,
          content: m.content,
        }))
      );
      setScore(sessionScore);
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string, gameMode?: GameMode, silent = false) => {
      if (!sessionId || !content.trim() || isLoading) return;

      if (!silent) {
        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content,
        };
        setMessages((prev) => [...prev, userMsg]);
      }
      setIsLoading(true);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
          },
          body: JSON.stringify({ message: content, gameMode }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "서버 오류");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("스트림을 읽을 수 없습니다.");

        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m))
          );
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );

        const parsed = parseScore(full);
        if (parsed !== null) setScore(parsed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: msg, streaming: false } : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setScore(0);
  }, []);

  return { messages, sendMessage, isLoading, score, clearMessages, initializeFromSession };
}
