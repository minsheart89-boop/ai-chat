# 실행 계획 — AI Quiz & Game Chatbot

> 각 단계는 순서대로 진행한다. 이전 단계가 완료되어야 다음 단계를 시작한다.

---

## Phase 1 — 프로젝트 초기 설정

- [x] **1-1.** Next.js 프로젝트 생성 (v16.2.7 설치됨)
  ```bash
  npx create-next-app@latest ai-chat --typescript --tailwind --app --src-dir --import-alias "@/*"
  ```
- [x] **1-2.** 핵심 의존성 설치
  ```bash
  # 실제 설치된 패키지 (docs 참고해 수정)
  npm install hono @mastra/core @ai-sdk/anthropic prisma @prisma/client zod
  # 제외: @hono/node-server (Next.js에 불필요), @mastra/agent (core에 포함), @anthropic-ai/sdk (→ @ai-sdk/anthropic 사용)
  ```
- [x] **1-3.** 개발 의존성 설치 (`@types/node`는 create-next-app에 포함됨)
- [x] **1-4.** shadcn/ui 초기화 (Nova 프리셋, Radix 기반)
  ```bash
  npx shadcn@latest init   # → Nova preset (Lucide / Geist)
  npx shadcn@latest add button input scroll-area badge
  ```
- [x] **1-5.** `.env.local` 파일 생성 및 `.env.example` 작성
  - `ANTHROPIC_API_KEY`
  - `DATABASE_URL`
- [x] **1-6.** `next.config.ts`에 `output: 'standalone'` 설정

---

## Phase 2 — 데이터베이스 설정 (Prisma + MongoDB)

> **Note:** Prisma v7은 MongoDB 드라이버 어댑터 미지원 → **Prisma v5.22.0으로 다운그레이드** 완료

- [x] **2-1.** Prisma 초기화
  ```bash
  npx prisma init --datasource-provider mongodb
  # prisma.config.ts(v7 전용) 삭제 후 schema.prisma에 url = env("DATABASE_URL") 직접 작성
  ```
- [x] **2-2.** `prisma/schema.prisma` 작성
  - `Session` 모델 정의 (`sessionId`, `gameMode`, `messages`, `score`)
  - `generator client { provider = "prisma-client-js" }` (v5 방식)
- [x] **2-3.** Prisma 클라이언트 생성 (`npx prisma generate` → `node_modules/@prisma/client`)
- [x] **2-4.** `src/db/prisma.ts` — Prisma 클라이언트 싱글턴 구현 (dev 핫리로드 방지 포함)
- [ ] **2-5.** MongoDB 연결 확인 (`npx prisma db push`)
  - ⚠️ `.env`의 `DATABASE_URL`에 실제 MongoDB 연결 문자열 입력 후 실행 필요

---

## Phase 3 — 세션 관리 유틸리티

- [x] **3-1.** `src/lib/session.ts` 작성
  - `generateSessionId()` — crypto.randomUUID 기반 ID 생성
  - `getOrCreateSession(sessionId)` — upsert로 세션 조회 또는 신규 생성
  - `appendMessage(sessionId, role, content)` — `messages: { push: message }` 로 추가
  - `updateScore(sessionId, delta)` — `score: { increment: delta }` 로 업데이트
  - `setGameMode(sessionId, gameMode)` — 게임 모드 설정 (추가)
  - `resetSession(sessionId)` — 세션 초기화 (추가)

---

## Phase 4 — Mastra AI 에이전트 구성

- [x] **4-1.** `src/mastra/index.ts` — Mastra 인스턴스 초기화, gameAgent 등록
- [x] **4-2.** `src/mastra/tools/quizTool.ts` 작성
  - `check-quiz-answer`: 답변 정규화 후 정오 검증, 난이도별 점수 반환
- [x] **4-3.** `src/mastra/tools/riddleTool.ts` 작성
  - `manage-riddle-hint`: 힌트 횟수 관리, 3회 초과 시 reveal_answer 반환
- [x] **4-4.** `src/mastra/tools/wordGameTool.ts` 작성
  - `validate-word-chain`: 끝말잇기 유효성 검사 (두음 법칙 포함)
- [x] **4-5.** `src/mastra/agents/gameAgent.ts` 작성
  - 시스템 프롬프트: 퀴즈/수수께끼/끝말잇기 진행 규칙 정의
  - model: `anthropic("claude-sonnet-4-6")`, tools 3종 등록
  - 수정: `execute({ context })` → `execute({ inputField })` (v1.41 API)

---

## Phase 5 — Hono API 서버 구현

- [x] **5-1.** `src/server/index.ts` — Hono 앱 루트, CORS + logger 미들웨어, `/chat` + `/session` 라우트 등록
- [x] **5-2.** `src/server/middleware/session.ts` — `x-session-id` 헤더에서 UUID 추출 및 형식 검증
- [x] **5-3.** `src/server/routes/chat.ts` — `POST /api/chat` 구현
  - zod(`@hono/zod-validator`)로 JSON 바디 검증
  - 세션 조회 → 게임모드 설정 → 유저 메시지 DB 저장
  - `agent.stream(history)` 호출 → `streamText(hono)` 로 청크 전달
  - 스트림 완료 후 AI 응답 DB 저장
  - 수정: `{ role: "user" as const }` — Mastra v1.41 타입 호환
- [x] **5-4.** `src/server/routes/session.ts` — `GET/DELETE /api/session/:sessionId`
- [x] **5-5.** `src/app/api/[[...route]]/route.ts` — `handle(app)` 로 Hono를 Next.js에 마운트 (`runtime = "nodejs"`)

---

## Phase 6 — 프론트엔드 UI 구현

- [x] **6-1.** `src/hooks/useSession.ts` — localStorage sessionId 관리, `newSession()`으로 초기화
- [x] **6-2.** `src/hooks/useChat.ts` — fetch + ReadableStream 스트리밍, 점수 갱신 포함
- [x] **6-3.** `src/components/GameModeSelector.tsx` — 카드형 게임 모드 선택 (퀴즈/수수께끼/끝말잇기)
- [x] **6-4.** `src/components/MessageBubble.tsx` — 좌우 버블 + 스트리밍 커서 애니메이션
- [x] **6-5.** `src/components/ChatInput.tsx` — 라운드 입력창 + 전송 버튼 (Enter 지원)
- [x] **6-6.** `src/components/ScoreBadge.tsx` — ⭐ 점수 뱃지 (shadcn Badge)
- [x] **6-7.** `src/components/ChatWindow.tsx` — ScrollArea + 자동 스크롤 + 로딩 dot 애니메이션
- [x] **6-8.** `src/app/page.tsx` — 헤더(모드·점수·재시작) + 모드 선택 → 채팅 화면 전환
  - 추가: `src/types/game.ts` — 클라이언트/서버 공유 타입 분리

---

## Phase 7 — 통합 테스트

- [x] **7-1.** `npm run dev` 서버 기동 및 검증 가능한 항목 전체 통과
  | 항목 | 결과 |
  |---|---|
  | `GET /` — UI 렌더링 (Korean 텍스트, shadcn 컴포넌트) | ✅ HTTP 200 |
  | `POST /api/chat` — 세션 ID 없음 | ✅ HTTP 400 |
  | `POST /api/chat` — 잘못된 UUID | ✅ HTTP 400 (수정: UUID 검증 추가) |
  | `POST /api/chat` — 빈 메시지 | ✅ HTTP 400 (Zod 검증) |
  | `POST /api/chat` — DB 없음 | ✅ HTTP 500 (dev: 상세, prod: sanitize) |
  | `DELETE /api/session/:id` — 구조 확인 | ✅ 라우트 정상 응답 |
  | `GET /api/unknown` — 404 | ✅ HTTP 404 |
  | TypeScript 컴파일 | ✅ 오류 없음 |
  - 수정: 에러 핸들러 prod sanitize, 채팅 라우트 UUID 검증 추가
  - ⚠️ AI 스트리밍 / 게임 플로우 테스트 → **ANTHROPIC_API_KEY + DATABASE_URL 설정 후 가능**
- [ ] **7-2.** 세션 복원 테스트 — 페이지 새로고침 후 이전 대화 이력 표시 확인
  - ⚠️ DATABASE_URL 설정 후 실행 필요
- [ ] **7-3.** 세션 초기화(게임 재시작) 동작 확인
  - ⚠️ DATABASE_URL 설정 후 실행 필요

---

## Phase 8 — Docker 및 Cloud Run 배포

- [x] **8-1.** `Dockerfile` 작성 (multi-stage: dependencies → builder → runner)
  - `output: 'standalone'` 기반 경량 이미지 (node:24-slim)
  - `PORT=8080`, `HOSTNAME=0.0.0.0` 환경 변수 설정
  - builder 단계에서 `npx prisma generate` 실행
- [x] **8-2.** `.dockerignore` 작성 (`node_modules`, `.env*`, `.next/cache` 등 제외)
- [ ] **8-3.** 로컬 Docker 빌드 및 실행 테스트
  - ⚠️ 로컬에 Docker가 설치되어 있지 않아 건너뜀 (Docker Desktop 설치 후 실행 가능)
  ```bash
  docker build -t ai-chat .
  docker run -p 8080:8080 --env-file .env.local ai-chat
  ```
- [ ] **8-4.** Google Cloud 설정 (직접 실행 필요)
  ```bash
  # PROJECT_ID를 실제 GCP 프로젝트 ID로 교체
  export PROJECT_ID=your-gcp-project-id
  gcloud config set project $PROJECT_ID
  gcloud services enable artifactregistry.googleapis.com run.googleapis.com
  gcloud artifacts repositories create ai-chat \
    --repository-format=docker \
    --location=asia-northeast3
  gcloud auth configure-docker asia-northeast3-docker.pkg.dev
  ```
- [ ] **8-5.** 이미지 빌드 및 푸시 (직접 실행 필요)
  ```bash
  docker build -t asia-northeast3-docker.pkg.dev/$PROJECT_ID/ai-chat/ai-chat:latest .
  docker push asia-northeast3-docker.pkg.dev/$PROJECT_ID/ai-chat/ai-chat:latest
  ```
- [ ] **8-6.** Cloud Run 배포 및 환경 변수 주입 (직접 실행 필요)
  ```bash
  gcloud run deploy ai-chat \
    --image asia-northeast3-docker.pkg.dev/$PROJECT_ID/ai-chat/ai-chat:latest \
    --platform managed \
    --region asia-northeast3 \
    --allow-unauthenticated \
    --set-env-vars "ANTHROPIC_API_KEY=sk-ant-...,DATABASE_URL=mongodb+srv://..."
  ```
- [ ] **8-7.** 배포된 URL에서 프로덕션 동작 최종 확인
  - `gcloud run services describe ai-chat --region asia-northeast3 --format='value(status.url)'`

---

## Phase 9 — 범위 변경 후 정리 작업

> 개발 과정에서 수수께끼·끝말잇기 제거, AI 모델 Anthropic→Groq 교체, 툴 제거 등 범위가 변경되었다.
> 코드베이스에 타입 불일치·미사용 파일·누락 기능 등 후속 정리가 필요하다.

### 9-1. 타입 불일치 수정 (TypeScript 컴파일 오류)

- [x] `src/lib/session.ts` — `GameMode` 타입을 `@/types/game`에서 import하도록 통일
- [x] `src/server/routes/chat.ts` — `z.enum(["quiz", "riddle", "word"])` → `z.enum(["quiz"])`로 축소
- [x] `src/components/GameModeSelector.tsx` — 미사용이므로 파일 삭제 (9-2와 통합)

### 9-2. 미사용 파일 삭제

- [x] `src/mastra/tools/quizTool.ts` 삭제
- [x] `src/mastra/tools/riddleTool.ts` 삭제
- [x] `src/mastra/tools/wordGameTool.ts` 삭제
- [x] `src/components/GameModeSelector.tsx` 삭제

### 9-3. 점수 동기화 버그 수정

- [x] B안 채택: AI 응답 텍스트에서 `parseScore()` 함수로 누적 점수 파싱 (`누적|총|현재 점수 N점` 패턴)
  → DB 조회 제거, 프론트엔드 상태로만 관리 (`useChat.ts`)

### 9-4. 세션 복원 구현 (TODO 7-2, 7-3)

- [x] `GET /api/session/:sessionId` — `messageCount` → `messages` 배열 전체 반환으로 수정
- [x] `useChat.ts` — `initializeFromSession(dbMessages, score)` 추가
- [x] `page.tsx` — 마운트 시 세션 조회 → 이력 있으면 복원 + `quizReady = true` 자동 설정
  → 로딩 중 스피너(`불러오는 중...`) 표시

### 9-5. 기타 정리

- [x] `src/app/layout.tsx` — `title: "퀴즈마스터"`, `lang="ko"` 업데이트
- [x] `.env.example` — `ANTHROPIC_API_KEY` → `GROQ_API_KEY`로 교체
- [x] `src/app/page.tsx` — 미사용 `greetingSentRef` 제거
- [x] `src/server/routes/chat.ts` — rate limit 에러 감지에 `"rate_limit_exceeded"`, `"Rate limit"` 추가

---

## 완료 기준 체크리스트

- [x] AI 응답 스트리밍 (타이핑 효과) 작동
- [x] TypeScript 컴파일 오류 없음
- [x] 점수가 헤더 뱃지에 정상 반영됨
- [x] 페이지 새로고침 후 대화 이력 복원 작동
- [ ] Docker 이미지 빌드 성공
- [ ] Cloud Run 배포 성공 및 외부 접속 확인
