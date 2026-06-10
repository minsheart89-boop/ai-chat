import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

export type SessionVariables = {
  sessionId: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const sessionMiddleware = createMiddleware<{
  Variables: SessionVariables;
}>(async (c, next) => {
  const sessionId =
    c.req.header("x-session-id") ?? c.req.query("sessionId");

  if (!sessionId) {
    throw new HTTPException(400, { message: "x-session-id 헤더가 필요합니다." });
  }

  if (!UUID_REGEX.test(sessionId)) {
    throw new HTTPException(400, { message: "유효하지 않은 세션 ID 형식입니다." });
  }

  c.set("sessionId", sessionId);
  await next();
});
