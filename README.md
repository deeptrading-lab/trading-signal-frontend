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

### AI 종합분석을 Codex CLI로 실행

AI 종합분석은 로컬 `next dev`에서만 CLI subprocess를 실행합니다.

```bash
cp .env.local.example .env.local
codex login
```

`.env.local`에 KIS 키와 Codex CLI 경로를 설정합니다.

```bash
KIS_APP_KEY=...
KIS_APP_SECRET=...
KIS_ACCOUNT_NO=...
KIS_ACCOUNT_PRODUCT_CD=01

CODEX_CLI_PATH=/Applications/Codex.app/Contents/Resources/codex
CODEX_CLI_WORKDIR=/tmp
# CODEX_CLI_MODEL=gpt-5.4
```

`npm run dev` 후 `/stock/005930`에서 `Codex` 버튼을 누르면 Codex 기반 AI 종합분석이 시작됩니다. Claude CLI를 사용하려면 같은 위치의 `Claude` 버튼을 선택합니다.

### AI 분석 결론 공유 저장

Portfolio Manager 최종 결론은 Supabase `ai_analysis_decisions` 테이블에 종목 코드별 최신 1건으로 저장합니다. 설정이 없으면 분석은 계속 가능하고, 이전 결론 조회/저장만 비활성화됩니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

테이블 스키마는 `docs/sql/ai-analysis-decisions.sql`을 적용합니다.

## 환경변수

```bash
FASTAPI_BASE_URL=http://127.0.0.1:8000
```

Vercel 배포 시 같은 값을 Vercel Environment Variables에 등록합니다.

## 현재 MVP

- 지원 종목: Apple(`AAPL`), Bitcoin(`BTC`, `BTC-USD`)
- 사용자 노출 문구: 한글 기본
- 스타일 톤: 토스 서비스와 유사한 밝고 간결한 금융 UI
- DB: Supabase 선택 연결. 현재는 AI 분석 최신 결론 공유 저장에 사용
