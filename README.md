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

## 환경변수

```bash
FASTAPI_BASE_URL=http://127.0.0.1:8000
```

Vercel 배포 시 같은 값을 Vercel Environment Variables에 등록합니다.

## 현재 MVP

- 지원 종목: Apple(`AAPL`), Bitcoin(`BTC`, `BTC-USD`)
- 사용자 노출 문구: 한글 기본
- 스타일 톤: 토스 서비스와 유사한 밝고 간결한 금융 UI
- DB: 아직 없음. Supabase는 다음 단계에서 연결 예정
