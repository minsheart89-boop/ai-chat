"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "ai-chat-session-id";

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSessionId(stored);
    } else {
      const newId = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, newId);
      setSessionId(newId);
    }
  }, []);

  const newSession = useCallback(() => {
    const newId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, newId);
    setSessionId(newId);
  }, []);

  return { sessionId, newSession };
}
