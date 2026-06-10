import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { mastra } from "@/mastra";
import {
  getOrCreateSession,
  appendMessage,
  setGameMode,
  type GameMode,
  type ChatMessage,
} from "@/lib/session";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const chatBodySchema = z.object({
  message: z.string().min(1, "메시지를 입력해주세요."),
  gameMode: z.enum(["quiz"]).optional(),
});

export const chatRoute = new Hono().post(
  "/",
  zValidator("json", chatBodySchema),
  async (c) => {
    const sessionId = c.req.header("x-session-id");
    if (!sessionId || !UUID_RE.test(sessionId)) {
      return c.json(
        { error: "유효한 x-session-id 헤더가 필요합니다." },
        400
      );
    }

    const { message, gameMode } = c.req.valid("json");

    const session = await getOrCreateSession(sessionId);

    if (gameMode && gameMode !== session.gameMode) {
      await setGameMode(sessionId, gameMode as GameMode);
    }

    await appendMessage(sessionId, "user", message);

    const history = [
      ...session.messages.map((m: ChatMessage) =>
        m.role === "user"
          ? ({ role: "user" as const, content: m.content })
          : ({ role: "assistant" as const, content: m.content })
      ),
      { role: "user" as const, content: message },
    ];

    const agent = mastra.getAgent("gameAgent");
    const agentStream = await agent.stream(history);

    let fullResponse = "";

    return streamText(c, async (stream) => {
      try {
        for await (const chunk of agentStream.textStream) {
          fullResponse += chunk;
          await stream.write(chunk);
        }
      } catch (err) {
        const isRateLimit =
          err instanceof Error &&
          (err.message.includes("quota") ||
            err.message.includes("rate_limit_exceeded") ||
            err.message.includes("Rate limit"));
        const msg = isRateLimit
          ? "AI 서비스 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요."
          : "AI 응답 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        await stream.write(msg);
        fullResponse = msg;
      }
      if (fullResponse) {
        await appendMessage(sessionId, "assistant", fullResponse).catch(
          () => {}
        );
      }
    });
  }
);
