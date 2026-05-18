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
