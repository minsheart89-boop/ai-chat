# AI Quiz & Game Chatbot

## Project Overview

엔터테인먼트 목적의 AI 챗봇. 사용자와 수수께끼(리들), 일반 상식 퀴즈, 단어 게임을 즐길 수 있는 B2C 서비스.
로그인 없이 세션 기반으로 작동하며, 미니멀/클린한 UI를 제공한다.

---

## Tech Stack

| 레이어 | 기술 |
|---|---|
| Frontend | Next.js 16 App Router, Tailwind CSS v4, shadcn/ui (Nova) |
| API Server | Hono v4 (Next.js catch-all API route에 마운트, `hono/vercel`) |
| ORM | Prisma v5 (MongoDB 네이티브 지원, 어댑터 불필요) |
| Database | MongoDB |
| AI Model | Claude (`claude-sonnet-4-6`) via `@ai-sdk/anthropic` |
| AI Agent Framework | Mastra |
| Deployment | Google Cloud Run (Docker) |

---

## Project Structure

```
ai-chat/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # 메인 채팅 UI
│   └── api/
│       └── [[...route]]/
│           └── route.ts          # Hono 앱 마운트 (catch-all)
├── src/
│   ├── server/
│   │   ├── index.ts              # Hono 앱 루트
│   │   ├── routes/
│   │   │   ├── chat.ts           # POST /api/chat
│   │   │   └── session.ts        # GET/DELETE /api/session
│   │   └── middleware/
│   │       └── session.ts        # 세션 미들웨어
│   ├── mastra/
│   │   ├── index.ts              # Mastra 인스턴스
│   │   ├── agents/
│   │   │   └── gameAgent.ts      # 게임 마스터 에이전트
│   │   └── tools/
│   │       ├── quizTool.ts       # 퀴즈 생성/검증 툴
│   │       ├── riddleTool.ts     # 수수께끼 툴
│   │       └── wordGameTool.ts   # 단어 게임 툴
│   ├── db/
│   │   └── prisma.ts             # Prisma 클라이언트 싱글턴
│   └── lib/
│       └── session.ts            # 세션 ID 생성/관리 유틸
├── prisma/
│   └── schema.prisma
├── Dockerfile
├── .env.local
└── .env.example
```

---

## Architecture

### Request Flow

```
Browser → Next.js App Router → Hono (catch-all route) → Mastra Agent → Claude API
                                         ↓
                                  MongoDB (Prisma)
                                  세션 컨텍스트 조회/저장
```

### Session Management

- 로그인 없음. 브라우저의 `localStorage` 또는 쿠키에 무작위 `sessionId` 저장
- 세션당 대화 이력은 MongoDB의 `Session` 컬렉션에 유지
- 서버 재시작 후에도 세션 ID가 살아있으면 대화 이력 복원 가능

### Hono + Next.js 통합 패턴

```ts
// app/api/[[...route]]/route.ts
import { handle } from 'hono/vercel'  // 또는 hono/nextjs
import app from '@/server/index'

export const { GET, POST, DELETE } = handle(app)
```

---

## Database Schema (Prisma + MongoDB)

```prisma
// prisma/schema.prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Session {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  sessionId String    @unique
  gameMode  String?   // "quiz" | "riddle" | "word"
  messages  Json[]    // { role: "user" | "assistant", content: string }[]
  score     Int       @default(0)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

> **주의:** Prisma + MongoDB는 `prisma migrate`를 지원하지 않는다. 스키마 변경 시 `npx prisma db push`를 사용한다.

---

## Mastra Agent

### Game Master Agent

`gameAgent`는 사용자의 선택에 따라 퀴즈, 수수께끼, 단어 게임 중 하나를 진행한다.

- **모델:** `claude-sonnet-4-6`
- **시스템 프롬프트:** 게임 진행자 페르소나. 문제 출제 → 사용자 답변 → 채점 → 다음 문제의 루프를 유지한다.
- **툴:**
  - `quizTool` — 카테고리/난이도 기반 퀴즈 문제 생성 및 정답 검증
  - `riddleTool` — 수수께끼 출제 및 힌트 제공
  - `wordGameTool` — 끝말잇기, 단어 연상 등 단어 게임 진행

### 스트리밍

Claude 응답은 `streamText` (Anthropic SDK) 또는 Mastra의 스트리밍 API를 통해 실시간으로 전달한다.
프론트엔드는 `ReadableStream` 또는 `EventSource`로 수신한다.

---

## Key API Endpoints (Hono)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | 메시지 전송, AI 응답 스트리밍 반환 |
| `GET` | `/api/session/:sessionId` | 세션 정보 및 대화 이력 조회 |
| `DELETE` | `/api/session/:sessionId` | 세션 초기화 (게임 재시작) |

### POST /api/chat Request Body

```json
{
  "sessionId": "uuid-v4",
  "message": "수수께끼 내줘",
  "gameMode": "riddle"
}
```

---

## Environment Variables

```env
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=mongodb+srv://...
NEXTAUTH_SECRET=...           # 세션 서명용 (필요 시)
```

---

## Development Commands

```bash
# 의존성 설치
npm install

# Prisma 클라이언트 생성
npx prisma generate

# DB 스키마 동기화 (MongoDB는 migrate 대신 db push 사용)
npx prisma db push

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# Docker 빌드
docker build -t ai-chat .

# Cloud Run 배포 (gcloud CLI 필요)
gcloud run deploy ai-chat \
  --image gcr.io/PROJECT_ID/ai-chat \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated
```

---

## Dockerfile

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server.js"]
```

> `next.config.ts`에 `output: 'standalone'` 설정 필요.

---

## Game Modes

### 1. 일반 상식 퀴즈 (`quiz`)
- 카테고리: 역사, 과학, 문화, 스포츠 등
- 난이도: 쉬움 / 보통 / 어려움
- 4지선다 또는 단답형
- 세션당 점수 누적

### 2. 수수께끼 (`riddle`)
- AI가 수수께끼를 출제
- 사용자가 정답을 맞히면 힌트 없이 통과
- 틀리면 힌트 최대 3회 제공
- 3회 후에도 못 맞히면 정답 공개

### 3. 단어 게임 (`word`)
- **끝말잇기:** AI와 번갈아 가며 단어 이어가기
- **단어 연상:** 제시어에서 연상되는 단어 대결

---

## UI Guidelines

- **디자인 원칙:** 미니멀/클린. 불필요한 장식 요소 제거
- **컬러:** 중성 계열(white/gray) 베이스, 포인트 컬러 1개 이하
- **컴포넌트:** shadcn/ui 기반. 커스텀 스타일은 Tailwind 유틸리티 클래스만 사용
- **채팅 UI:** 메시지 버블 형태. AI 응답은 스트리밍으로 타이핑 효과 표시
- **게임 선택:** 첫 진입 시 게임 모드 선택 화면 또는 채팅 내에서 선택 가능

---

## Constraints & Notes

- **인증 없음:** 세션 ID는 클라이언트에서 생성, 서버에 저장하지 않는 PII 없음
- **Prisma + MongoDB:** `db push` 전용. 마이그레이션 파일 생성 불필요
- **Cloud Run 특성:** 인스턴스가 스케일다운될 수 있으므로 인메모리 상태에 의존하지 말 것. 모든 상태는 MongoDB에 저장
- **스트리밍:** Cloud Run은 HTTP/2 스트리밍을 지원하나, 응답 시간이 길면 타임아웃 설정 확인 필요 (`--timeout` 플래그)
