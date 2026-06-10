import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { chatRoute } from "@/server/routes/chat";
import { sessionRoute } from "@/server/routes/session";

const app = new Hono().basePath("/api");

app.use(logger());
app.use(cors({ origin: "*", allowMethods: ["GET", "POST", "DELETE", "OPTIONS"] }));

app.route("/chat", chatRoute);
app.route("/session", sessionRoute);

app.onError((err, c) => {
  console.error(err);
  const status = "status" in err ? (err.status as number) : 500;
  const isProd = process.env.NODE_ENV === "production";
  const message =
    status < 500
      ? (err.message ?? "잘못된 요청입니다.")
      : isProd
        ? "서버 오류가 발생했습니다."
        : (err.message ?? "서버 오류가 발생했습니다.");
  return c.json({ error: message }, status as 400 | 500);
});

export default app;
