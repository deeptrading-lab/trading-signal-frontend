# PRD: frontend-architecture-restructure

- **slug**: `frontend-architecture-restructure`
- **작성일**: 2026-05-20
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: HANDOFF PR #6 / #7 후속, `signal-workbench-frontend-mvp` PRD 의 아키텍처 영역만 재구성
- **UI 포함 여부**: no (디자인 시스템·화면 변경 없음. 폐기 화면은 후속 PRD `workbench-analyze-rebuild` 가 담당)
- **선행 / 후행 관계**: 본 PRD 머지 후 → `workbench-analyze-rebuild` 진입. 두 PRD 는 동시 머지 금지 (본 PRD 의 클라이언트 모듈을 후속 PRD 가 import).

## 1. 배경 / 문제

PR #6 (BE/AI 자산 engine 레포 분리) 머지 후 BE 인터페이스를 다시 살펴본 결과, 현재 `app/page.tsx` 가 가정한 백엔드 계약이 실제 `trading-signal-engine` 의 FastAPI 와 완전히 다르다는 점이 드러났다.

- 현재 코드의 가정: `POST http://127.0.0.1:8765/api/bitcoin/brief`, body `{symbol, timeframe, offline, cash_amount, cash_currency, btc_holding_amount, llm_provider, data_provider}`, 응답 `Brief` (BTC 단일·sizing·news_snapshot 모델).
- 실제 BE (`http://127.0.0.1:8000`, env `FASTAPI_BASE_URL` 기본값):
  1. `GET /health`
  2. `GET /api/whitelist/search?q=<keyword>` — 화이트리스트 검색 (현재 `AAPL`, `BTC-USD` 두 종목)
  3. `POST /api/workbench/analyze` — body `{ticker, capital_amount, target_return_pct, target_period_days, max_loss_pct, offline}`, 응답 `{brief, feasibility, horizons, risk_plan, action, warnings}` 6블록.

문제는 단순 포트·경로 차이가 아니라 요청·응답 모델, 결과적으로 UX 모델까지 다르다는 점이다. 또한 현재 `app/page.tsx` 는 (a) 브라우저에서 FastAPI 를 직접 호출 (AGENTS.md "브라우저는 FastAPI를 직접 호출하지 않는다" 원칙 위반), (b) URL·payload 가 인라인 하드코딩, (c) 데이터 페칭 상태 관리가 `useState`+`fetch` 수기 패턴, (d) 단일 파일에 화면·로직·타입이 섞여 있다 — 즉 후속 ticker-agnostic 워크벤치 화면을 안전하게 얹을 토대가 없다.

본 PRD 는 화면 재구성과 분리해 **데이터 흐름·폴더 구조·HTTP/쿼리 라이브러리 도입** 만 책임진다. 화면(workbench-analyze) 재작성은 별도 PRD 가 본 PRD 의 산출물을 소비한다.

## 2. 목표

- 브라우저 → Next.js route handler → FastAPI 로 단방향 호출만 남기고, `app/page.tsx` 의 직접 호출을 제거한다.
- axios 기반 단일 HTTP 클라이언트와 TanStack Query v5 기반 데이터 페칭 인프라를 도입한다.
- BE 의 3개 엔드포인트(`/health`, `/api/whitelist/search`, `/api/workbench/analyze`) 에 대응하는 타입·클라이언트 함수·route handler 정합을 갖춘다.
- `app/` 단일 파일 인라인 구조를 폐기하고 page / component / query / lib / types 등 역할별 폴더로 재정렬한다 (구체 트리는 FE Dev 재량).
- 후속 PRD 가 화면 재작성에 들어갈 때 추가 인프라 의사결정 없이 컴포넌트·훅만 만들어도 되는 상태를 만든다.

## 3. 범위 (In scope)

- axios 인스턴스 1개 도입 (`baseURL` = same-origin, route handler 경유. 직접 FastAPI 호출 금지).
- TanStack Query v5 도입 — `QueryClientProvider` 를 App Router 의 적절한 경계에 배치 (RSC/CSR 경계는 FE Dev 재량).
- BE 응답 타입 모듈화: `brief`, `feasibility`, `horizons`, `risk_plan`, `action`, `warnings` 6블록 + `WhitelistItem` (필드: `ticker, name, asset_type, exchange, currency, sector, risk_tier, aliases`).
- 클라이언트 함수: `searchWhitelist(q)`, `analyzeWorkbench(payload)` — axios + 타입.
- TanStack Query 훅: `useWhitelistSearch(q)`, `useAnalyzeWorkbench()` (mutation). 화면 컴포넌트에서 import 만 하면 되는 상태.
- 입력 유효성 사전 차단 로직 (타입·범위) 의 **순수 함수** 화: `target_period_days > 0 (정수)`, `0 < max_loss_pct <= 5`, `capital_amount > 0`, `target_return_pct >= 0`, `ticker` 화이트리스트 멤버십. UI 바인딩은 후속 PRD.
- route handler 보강: `app/api/whitelist/search/route.ts`, `app/api/workbench/analyze/route.ts` 가 (a) `FASTAPI_BASE_URL` 만으로 dev/prod 전환, (b) 5xx/4xx 시 BE 본문을 그대로 통과시키되 상태 코드·메시지가 클라이언트에서 식별 가능한 형태로 유지, (c) `cache: "no-store"` 유지.
- 폴더 트리 재구성 가이드라인 (PRD 는 가이드만, 실제 트리는 FE Dev 재량):
  - 화면 단위 component / 재사용 가능한 ui 분리
  - `lib/api/*` (axios 인스턴스·클라이언트 함수)
  - `lib/query/*` (queryKeys·hooks)
  - `lib/types/*` (BE 응답 타입)
  - `lib/validation/*` (입력 사전 차단)
  - 기존 `app/page.tsx` 는 본 PRD 단계에서는 **빌드만 통과**할 정도로 손대고 (예: 기존 직접 호출 제거 + "재구성 중" placeholder), 화면 재작성은 후속 PRD.
- `package.json` 의존성 추가: `axios`, `@tanstack/react-query` (v5 라인). 다른 라이브러리 추가 없음.
- 환경변수 문서화: `.env.example` 에 `FASTAPI_BASE_URL` 기본값(`http://127.0.0.1:8000`) 주석 갱신.

## 4. 비범위 (Out of scope)

- 화면(UI) 재작성 — 후속 PRD `workbench-analyze-rebuild` 가 담당.
- 디자인 토큰·디자인 시스템 정착 (`app/globals.css` 의 CSS custom property 그대로 유지).
- Tailwind / shadcn/ui / 기타 CSS 프레임워크 도입.
- Supabase 연동·인증·세션 (BE 가 `ALLOW_UNAUTHENTICATED_WORKBENCH=1` 로 운영).
- 차트 시각화 라이브러리 도입.
- Vercel 배포 환경변수 등록·실제 배포 (DevOps 별도 트랙).
- BE 분석 계산식 변경.
- E2E·시각 회귀 테스트 도입.

## 5. 수용 기준 (AC)

검증 가능한 문장 단위.

- **AC-1 (직접 호출 금지)**: `git grep -nE "http://127\.0\.0\.1:(8000|8765)" -- app/` 결과 0건. 단, `app/api/**/route.ts` 안의 `FASTAPI_BASE_URL` fallback 만 예외.
- **AC-2 (env 단일 진입)**: `FASTAPI_BASE_URL` 만 변경하여 dev (`http://127.0.0.1:8000`) → prod 환경에서 분석 요청이 동작한다. 코드 수정 없이 환경변수만으로 전환 가능.
- **AC-3 (axios 단일 인스턴스)**: HTTP 클라이언트는 axios 인스턴스 1개를 통해 호출된다. `fetch(` 직접 호출은 `app/api/**/route.ts` (server-side proxy) 안에서만 허용. 클라이언트 코드에서 `fetch(` 사용 0건.
- **AC-4 (TanStack Query 적용)**: 화이트리스트 검색·분석 요청은 모두 TanStack Query v5 의 `useQuery` / `useMutation` 으로 수행된다. 컴포넌트 내부 `useState` + `useEffect` 로 fetch 트리거하는 패턴 0건.
- **AC-5 (타입 일치)**: BE 응답 6블록(`brief`, `feasibility`, `horizons`, `risk_plan`, `action`, `warnings`) + `WhitelistItem` 의 TypeScript 타입이 `lib/types/*` (또는 동등 위치) 에 정의되어 있고, 클라이언트 함수 반환 타입이 이 타입을 그대로 사용한다. `any` 사용 0건 (`unknown` 은 허용, 사용처에서 narrowing).
- **AC-6 (입력 사전 차단 단위 테스트 또는 명시적 호출 가능)**: `validateAnalyzePayload(input)` 같은 순수 함수가 존재하고, 다음을 거절한다.
  - `capital_amount` ≤ 0 또는 NaN
  - `target_return_pct` < 0 또는 NaN
  - `target_period_days` ≤ 0 또는 정수 아님
  - `max_loss_pct` ≤ 0 또는 > 5 또는 NaN
  - `ticker` 가 빈 문자열 또는 화이트리스트에 없는 값
  - 각 거절은 사용자 노출 가능한 한글 메시지를 반환 (UI 바인딩은 후속 PRD).
- **AC-7 (route handler 정합)**: `app/api/whitelist/search/route.ts` 는 BE 가 4xx/5xx 응답 시 `response.status` 와 body 를 그대로 전달한다. `app/api/workbench/analyze/route.ts` 도 동일. 빈 본문·JSON 파싱 실패 시 500 + 한글 에러 메시지로 폴백.
- **AC-8 (build/typecheck/lint)**: `npm run typecheck`, `npm run build`, `npm run lint` 모두 0 에러로 통과한다.
- **AC-9 (폴더 분리)**: `app/page.tsx` 가 더 이상 단일 파일로 모든 책임(타입·fetch·UI·상태)을 갖지 않는다. 적어도 타입·HTTP 클라이언트·쿼리 훅·검증 로직 4가지는 별도 모듈에 위치한다.
- **AC-10 (placeholder 안전)**: 본 PRD 단계의 `app/page.tsx` 가 빌드/타입체크를 통과하고, 직접 호출이 없으며, 후속 PRD 가 곧 재작성할 것임을 화면 또는 코멘트에서 명시한다. (사용자에게 깨진 UI 가 노출되지 않도록 최소한 "재구성 중" 안내.)
- **AC-11 (whitelist 검색 라운드트립)**: dev 환경에서 `/api/whitelist/search?q=APPLE` 호출 시 BE 가 alias 매칭으로 AAPL 을 돌려주는 흐름이 클라이언트 함수 + route handler 를 통해 검증된다 (수동 QA 시점 또는 단위 테스트).

## 6. 가정 · 제약

- BE 서버는 engine 레포에서 `ALLOW_UNAUTHENTICATED_WORKBENCH=1 PYTHON=.venv/bin/python make signal-workbench` 로 띄워 `127.0.0.1:8000` 에 LIVE 인 상태를 dev 기본 가정으로 한다.
- BE Swagger UI 는 `http://127.0.0.1:8000/docs`. PRD 검토자(개발자·QA)는 필요 시 Swagger 응답 스키마를 1차 근거로 본다.
- 데이터 페칭 라이브러리는 TanStack Query v5 로 확정 (사용자 결정). React Query v5 의 App Router 권장 셋업(provider 위치·hydration 경계)을 따른다.
- HTTP 클라이언트는 axios 로 확정 (사용자 결정). 인터셉터 정책(retry·timeout·에러 매핑)은 FE Dev 재량이나 timeout 은 기본 30 초 이내.
- 화이트리스트는 현재 BE 가 `AAPL`, `BTC-USD` 둘만 노출. 본 PRD 는 그 사실에 의존하지 않고, BE 응답을 그대로 신뢰한다 (목록 확장 시 코드 수정 불요).
- BE 의 `offline` 파라미터는 본 PRD 의 타입·클라이언트 함수에서 옵셔널로 노출하되, 화면 노출 정책은 후속 PRD 결정.
- 본 PRD 단계에서는 사용자 노출 메시지의 한글 톤만 한 번 정의해두고, 디자인 시스템·간격·색은 후속 PRD 가 결정.

## 7. 참고

- `AGENTS.md` — 작업 원칙 ("브라우저는 FastAPI를 직접 호출하지 않는다", env 정책), 에이전트 역할 표, 산출물 위치.
- `docs/rules/frontend.md` — FE 규칙.
- `docs/prd/signal-workbench-frontend-mvp.md` — 직전 MVP PRD. 본 PRD 는 그 후속 정정.
- `app/page.tsx` — 현재의 잘못된 가정 (BTC 단일 sizing 모델).
- `app/api/whitelist/search/route.ts`, `app/api/workbench/analyze/route.ts` — 현재 route handler. 본 PRD 가 보강.
- `app/globals.css` — CSS custom property (`--accent`, `--warn`, `--blue`, `--panel`). 본 PRD 는 변경하지 않음.
- `docs/HANDOFF.md` PR #6 / #7 entry — 직전 정리 작업, "다음 작업" 후보 중 1번 항목 (page.tsx 직접 호출 정정) 을 본 PRD 가 흡수.
- engine 레포 BE 코드 (PRD 검토 시 직접 열람 불요, Swagger 우선): `server.py` (FastAPI 진입), `workbench.py` (`analyze_workbench` 본체).

## 8. PRD 분할 판단 근거

본 작업은 두 영역으로 자연 분기된다.

- 영역 A (본 PRD): 아키텍처 기반 — axios·TanStack Query·폴더·타입·클라이언트 함수·route handler 정합. UI 변경 없음.
- 영역 B (후속 PRD `workbench-analyze-rebuild`): BE 6블록 응답 기반 화면 재작성. UI 디자이너 합류 필요.

분할 사유:
1. 두 영역의 PR 을 하나로 묶으면 +1000 라인 급 단일 PR 이 되어 reviewer 부담·롤백 단위가 비대해진다.
2. 본 PRD 만 머지된 시점에도 회귀 가능 — typecheck/build/route handler 라운드트립으로 검증 종료. UI 가 placeholder 라는 점은 명시.
3. 후속 PRD 는 본 PRD 의 산출물(`useAnalyzeWorkbench`, 타입, 검증 함수)을 import 만 하면 되므로 UI 디자이너·FE Dev 가 화면·UX 에만 집중 가능.
4. 후속 PRD 의 변경 영역이 디자인 토큰·접근성·문구 톤까지 걸치므로 디자이너 산출물(`docs/design/workbench-analyze-rebuild.md`) 의존이 강함 — 본 PRD 와 같은 PR 에 묶으면 디자이너 단계가 아키텍처 진행을 블로킹.

## 9. OPEN QUESTION

후속 PRD 또는 본 PRD 의 구현 단계에서 사용자 결정이 필요한 항목.

- `[OPEN QUESTION] AC-2 (env 단일 진입)` 의 prod URL — Vercel 배포 시 BE 가 어디에서 돌지 미정. AWS App Runner / Fly.io / 별도 호스트 결정 시점에 `FASTAPI_BASE_URL` 값만 설정하면 되는 형태로 본 PRD 는 코드 측만 책임. 호스트 결정 자체는 DevOps 트랙.
- `[OPEN QUESTION] QueryClient 옵션 기본값` — `staleTime`, `retry`, `refetchOnWindowFocus` 등의 기본값. analyze 는 mutation 이라 무관, whitelist 검색은 사용자 타이핑 흐름과 맞물려야 함 (debounce + staleTime 조합). FE Dev 재량으로 채택하되 후속 PRD 화면 설계 시점에 디자이너와 한 번 검토.
- `[OPEN QUESTION] axios 에러 매핑 표준` — BE 가 422 (Pydantic validation) / 4xx (whitelist miss) / 5xx (Yahoo fallback 실패 등) 를 모두 낼 수 있다. 통합 에러 객체 형태(`{kind, message, status}`) 를 본 PRD 가 결정할지, 후속 PRD 에서 디자이너 메시지 톤과 함께 결정할지. PM 권고: 본 PRD 가 최소 골격(`kind: 'validation' | 'whitelist_miss' | 'network' | 'server'`)만 정의하고 메시지 카피는 후속 PRD.
- `[OPEN QUESTION] offline 토글의 화면 노출 여부` — 본 PRD 는 타입·클라이언트 함수에 `offline?: boolean` 만 흘려두고, UI 노출은 후속 PRD 결정.
