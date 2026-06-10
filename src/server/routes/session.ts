import { Hono } from "hono";
import { getOrCreateSession, resetSession } from "@/lib/session";
import { sessionMiddleware, type SessionVariables } from "@/server/middleware/session";

export const sessionRoute = new Hono<{ Variables: SessionVariables }>()
  .get("/:sessionId", sessionMiddleware, async (c) => {
    const sessionId = c.get("sessionId");
    const session = await getOrCreateSession(sessionId);
    return c.json({
      sessionId: session.sessionId,
      gameMode: session.gameMode,
      score: session.score,
      messages: session.messages,
      createdAt: session.createdAt,
    });
  })
  .delete("/:sessionId", sessionMiddleware, async (c) => {
    const sessionId = c.get("sessionId");
    await resetSession(sessionId);
    return c.json({ ok: true, message: "세션이 초기화됐습니다." });
  });
