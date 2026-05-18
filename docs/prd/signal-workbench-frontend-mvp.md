# PRD: signal-workbench-frontend-mvp

- **slug**: `signal-workbench-frontend-mvp`
- **작성일**: 2026-05-10
- **서비스명**: `TradingSignalEngine`
- **저장소**: `trading-signal-frontend`
- **기술 스택**: Next.js App Router, TypeScript, CSS, Vercel
- **백엔드 연결**: Next.js route handler → `trading-signal-engine` FastAPI
- **DB**: 현재 없음. Supabase 예정

## 1. 배경 / 문제

기존 MVP는 `trading-signal-engine` 내부 Python 엔진과 임시 HTML 화면이 함께 있었다. 이제 프론트엔드는 별도 저장소로 분리하고, 엔진은 FastAPI 분석 API만 제공해야 한다.

## 2. 목표

- 사용자가 Apple 또는 Bitcoin을 검색한다.
- 투입 자본금, 목표 수익률, 목표 기간, 거래당 최대 손실률을 입력한다.
- Next.js가 FastAPI 분석 API를 호출하고 결과를 한글 UI로 표시한다.
- Vercel에 올릴 수 있는 Next.js 구조를 갖춘다.

## 3. 범위

In scope:

- Next.js 앱 스캐폴딩
- Toss tone에 가까운 밝고 간결한 금융 UI
- 결론 중심 Hero, 권장 투자금, 익절/손절, 손익 시뮬레이션, 리스크 우선 표시
- KRW 기본 표시와 USD/KRW 토글
- `/api/whitelist/search` route handler
- `/api/workbench/analyze` route handler
- `FASTAPI_BASE_URL` 환경변수
- Apple/BTC 분석 화면
- 프론트엔드 에이전트 역할 문서

Out of scope:

- Supabase 실제 연결
- 사용자 로그인
- 포지션 저장
- Vercel production 배포 실행
- FastAPI 분석 계산식 변경

## 4. 수용 기준

- `npm run typecheck`가 통과한다.
- `npm run build`가 통과한다.
- `FASTAPI_BASE_URL`이 설정되어 있으면 Next.js route handler가 FastAPI를 프록시한다.
- 화면의 사용자 노출 문구는 ticker/API 식별자를 제외하고 한글이다.
- Apple과 BTC 검색 결과가 표시된다.
- 분석 성공 시 최종 판단, 목표 현실성, 권장 매수 금액, 익절가, 손절가, 기간별 흐름, 근거/리스크가 표시된다.

## 5. 스펙 변경 사항

- 원래 엔진 내부에 있던 정적 HTML 프론트엔드는 제거한다.
- 엔진 서버는 FastAPI로 변경한다.
- 브라우저는 FastAPI를 직접 호출하지 않고 Next.js route handler를 호출한다.
- Next.js가 현재 백엔드 역할을 겸하고, Supabase는 후속 단계에서 붙인다.

## 6. 개발자 전달 사항

- 로컬에서는 엔진 API를 먼저 `make signal-workbench`로 띄운다.
- 프론트는 `npm run dev`로 띄운다.
- Vercel에는 `FASTAPI_BASE_URL`을 환경변수로 등록해야 한다.
- Supabase 연결 시 필요한 값은 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`다.
