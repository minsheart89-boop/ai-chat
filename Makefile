.PHONY: install setup dev build start db-push db-studio \
        docker-build docker-run gcp-setup gcp-push deploy

# ── 환경 변수 ────────────────────────────────────────────
PROJECT_ID  ?= your-gcp-project-id
REGION      ?= asia-northeast3
IMAGE       := $(REGION)-docker.pkg.dev/$(PROJECT_ID)/ai-chat/ai-chat:latest
APP_NAME    := ai-chat

# ── 초기화 ───────────────────────────────────────────────
install:        ## 의존성 설치
	npm install

setup: install  ## 의존성 설치 + Prisma 클라이언트 생성 + DB 동기화
	npx prisma generate
	npx prisma db push

# ── 개발 서버 ────────────────────────────────────────────
dev:            ## 개발 서버 실행 (http://localhost:3000)
	npm run dev

# ── 빌드 ─────────────────────────────────────────────────
build:          ## 프로덕션 빌드
	npx prisma generate
	npm run build

start: build    ## 프로덕션 빌드 후 서버 실행
	npm start

# ── 데이터베이스 ──────────────────────────────────────────
db-push:        ## Prisma 스키마를 MongoDB에 동기화
	npx prisma db push

db-studio:      ## Prisma Studio 실행 (DB 브라우저)
	npx prisma studio

# ── Docker ───────────────────────────────────────────────
docker-build:   ## Docker 이미지 빌드
	docker build -t $(APP_NAME) .

docker-run:     ## Docker 컨테이너 실행 (포트 8080)
	docker run -p 8080:8080 --env-file .env.local $(APP_NAME)

# ── Google Cloud Run 배포 ────────────────────────────────
gcp-setup:      ## GCP 서비스 활성화 + Artifact Registry 저장소 생성
	gcloud config set project $(PROJECT_ID)
	gcloud services enable artifactregistry.googleapis.com run.googleapis.com
	gcloud artifacts repositories create $(APP_NAME) \
	  --repository-format=docker --location=$(REGION) || true
	gcloud auth configure-docker $(REGION)-docker.pkg.dev

gcp-push:       ## Docker 이미지 빌드 후 Artifact Registry에 푸시
	docker build -t $(IMAGE) .
	docker push $(IMAGE)

deploy:         ## Cloud Run에 배포 (환경변수 주입 포함)
	@if [ -z "$(ANTHROPIC_API_KEY)" ] && [ -z "$(GROQ_API_KEY)" ]; then \
	  echo "Error: ANTHROPIC_API_KEY 또는 GROQ_API_KEY 를 환경변수로 전달하세요."; \
	  echo "  예) make deploy GROQ_API_KEY=gsk_... DATABASE_URL=mongodb+srv://..."; \
	  exit 1; \
	fi
	gcloud run deploy $(APP_NAME) \
	  --image $(IMAGE) \
	  --platform managed \
	  --region $(REGION) \
	  --allow-unauthenticated \
	  --set-env-vars "GROQ_API_KEY=$(GROQ_API_KEY),DATABASE_URL=$(DATABASE_URL)"

# ── 도움말 ───────────────────────────────────────────────
help:           ## 사용 가능한 명령어 목록
	@grep -E '^[a-zA-Z_-]+:.*##' Makefile | \
	  awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
