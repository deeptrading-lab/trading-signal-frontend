# TradingSignalEngine Frontend

Next.js 기반 TradingSignalEngine 프론트엔드입니다.

## 구조

```text
Browser
→ Next.js page
→ Next.js route handler
→ trading-signal-engine FastAPI
```

## 로컬 실행

1. 엔진 API 실행

```bash
cd ../trading-signal-engine
make signal-workbench
```

2. 프론트엔드 실행

```bash
cd ../trading-signal-frontend
npm install
npm run dev
```

3. 브라우저

```text
http://localhost:3000
```

### 스윙 체크(규칙서 결정론 판정)

종목 판정은 AI 가 아니라 코드가 한다 — 규칙서 `lib/swing/rulebook.ts`(swing-v1) + `lib/swing` 엔진.
매일 07:20 KST GitHub Actions 가 `/api/cron/swing-screener` 를 불러 전 거래일 판정을 Supabase
`swing_judgments` 에 저장하고(`docs/sql/swing-judgments.sql`), `/swing` 화면과 종목 상세 카드가 읽는다.
PRD: `docs/prd/swing-judgment.md`.

### AI 뉴스·공시 정리(로컬 워커)

AI 는 종목 뉴스·공시를 모아 요약만 한다(판정에 쓰지 않음). 종목 카드의 "AI로 정리하기" 요청을
로컬 워커가 Claude/Codex CLI 로 처리한다.

```bash
cp .env.local.example .env.local   # KIS·Supabase 키 설정
npm run all                        # next dev + 워커(scripts/analysisWorker.ts)
```

테이블 스키마는 `docs/sql/swing-ai-notes.sql` 을 1회 적용한다.

## 환경변수

```bash
FASTAPI_BASE_URL=http://127.0.0.1:8000
```

Vercel 배포 시 같은 값을 Vercel Environment Variables에 등록합니다.

## 현재 MVP

- 지원 종목: Apple(`AAPL`), Bitcoin(`BTC`, `BTC-USD`)
- 사용자 노출 문구: 한글 기본
- 스타일 톤: 토스 서비스와 유사한 밝고 간결한 금융 UI
- DB: Supabase — 스윙 판정·AI 노트·단타 세션·로그인 프로필 저장
