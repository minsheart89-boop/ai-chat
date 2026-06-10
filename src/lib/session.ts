import { prisma } from "@/db/prisma";
import type { Session } from "@prisma/client";
import type { GameMode } from "@/types/game";

export type { GameMode };

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type SessionWithMessages = Omit<Session, "messages"> & {
  messages: ChatMessage[];
};

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export async function getOrCreateSession(
  sessionId: string
): Promise<SessionWithMessages> {
  const session = await prisma.session.upsert({
    where: { sessionId },
    update: {},
    create: {
      sessionId,
      messages: [],
      score: 0,
    },
  });

  return {
    ...session,
    messages: (session.messages as unknown as ChatMessage[]) ?? [],
  };
}

export async function setGameMode(
  sessionId: string,
  gameMode: GameMode
): Promise<void> {
  await prisma.session.update({
    where: { sessionId },
    data: { gameMode },
  });
}

export async function appendMessage(
  sessionId: string,
  role: ChatMessage["role"],
  content: string
): Promise<void> {
  const message: ChatMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  await prisma.session.update({
    where: { sessionId },
    data: {
      messages: {
        push: message,
      },
    },
  });
}

export async function updateScore(
  sessionId: string,
  delta: number
): Promise<number> {
  const updated = await prisma.session.update({
    where: { sessionId },
    data: {
      score: { increment: delta },
    },
    select: { score: true },
  });

  return updated.score;
}

export async function resetSession(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { sessionId },
    data: {
      messages: [],
      score: 0,
      gameMode: null,
    },
  });
}
