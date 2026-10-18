# QA — calibration-admin-only ('실측 적중률' 배지·보정 API 관리자 전용)

- 실행: 2026-10-18 20:05~20:20 KST, QA 역할
- 대상: PR #394 `feature/calibration-admin-only` @ `a5f082b`
- 근거: 경량 픽스라 PRD 없음. PR 본문과 오케스트레이터가 준 AC 1~5. 연관 PRD `ai-direction-quality` §10-1 (오픈베타 조건 5 "사용자 노출 카피에 적중률·수익 보장 문구 0")
- 변경 파일 3개: `app/api/scorecard/calibration/route.ts`, `app/api/scorecard/calibration/__tests__/route.test.ts`(신규), `hooks/scorecard/useConfidenceCalibration.ts`
- QA 는 코드를 고치지 않았다. 라이브 확인용 세션 토큰 발급 스크립트는 `/tmp` 에 만들고 끝난 뒤 지웠다.

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 1-a 비관리자 403 + 원장 미조회 | `npx vitest run app/api/scorecard` | 403, `getAllScorecardRows` 호출 0 | `route.test.ts` "비관리자는 403 이고 채점 원장을 읽지 않는다" 통과 (`not.toHaveBeenCalled`) | 통과 |
| 1-b 관리자 200 | 같은 테스트 파일 | 200 + `{configured:true, calibrations:[]}` | "관리자는 보정값을 받는다" 통과 (`toHaveBeenCalledOnce`) | 통과 |
| 1-c 게이트 위치 (코드) | `route.ts` GET 본문 | 원장 조회·설정 확인보다 먼저 게이트 | `GET(request)` 의 첫 두 줄이 `const denied = await requireAdminApi(request); if (denied) return denied;`. `isScorecardStoreConfigured()`·`getAllScorecardRows()` 보다 먼저 실행된다 | 통과 |
| 1-d summary 라우트와 같은 패턴 | `app/api/scorecard/summary/route.ts` 와 비교 | 같은 헬퍼·같은 위치 | 두 라우트 모두 `requireAdminApi` (`lib/server/auth/apiGuard.ts`, 환경 무관 admin+, DB 기준 live role) 를 GET 첫 줄에서 호출. 403 본문 `{error:"forbidden"}` + `Cache-Control: no-store` 도 같음 | 통과 |
| 1-e 라이브 (next start :3394) | 아래 "라이브 확인" 절 | 비관리자 세션 403, summary 와 같은 응답 | 일반 등급 서명 세션: calibration **403** `{"error":"forbidden"}`, summary **403**. 무세션·위조 쿠키: 둘 다 401 (proxy 로그인 게이트가 먼저 막음) | 통과 |
| 2-a 비관리자는 요청을 안 보냄 | `hooks/scorecard/useConfidenceCalibration.ts:33-34` | `enabled` 가 false | `useQueryScorecardCalibration(enabled && isAdmin)`. `useMe().isAdmin = isAtLeast(role,"admin")` 이고 로딩·미인증·role null 이면 false. 페칭 훅은 `enabled` 를 `useQuery` 에 그대로 넘긴다 → 요청 0건 | 통과 |
| 2-b 403 이 나도 토스트/콘솔이 안 생기는지 | `app/providers.tsx`, `lib/api/client.ts` | 쿼리 에러용 전역 토스트 없음 | `QueryCache` 는 `onSuccess`(시세 store 라우팅)만 등록, `onError` 없음. 전역 토스트는 `MutationCache.onError` 뿐이라 쿼리와 무관. axios 인터셉터는 403 을 `ApiError("server")` 로 바꿔 reject 만 하고 토스트·`console` 은 없음 (401 일 때만 `/login` 이동). 페칭 훅 `retry: 0`. 정리하면 요청 자체를 안 보내고, 보내더라도 사용자 눈에 띄는 오류는 없다 | 통과 |
| 2-c useMe 로딩 → 관리자 확정 후 조회 | 코드 | 로딩 중 false → 확정 후 true 로 바뀌면 조회 | `useQueryMe` (staleTime 5분, retry 0) 가 끝나면 `isAdmin` 이 true 로 바뀌고, `enabled` 가 false→true 가 되면 TanStack Query v5 가 그때 fetch 한다. 그 사이 훅은 `data` undefined → `getCalibration` null → 배지 없음 (깜빡임 없음, 나중에 배지가 붙기만 함) | 통과 (코드 기준. 관리자 세션 라이브는 미실행, 관찰 1) |
| 3-a VerdictHero null 분기 | `components/stock/ai-analysis/VerdictHero.tsx:313` | null 이면 배지 DOM 없음 | `{calibration && (<span …>)}`. 외부 `VerdictHero` 의 기본값 `calibration = null`. null 이면 `.v-meta` 안에 기간·가격·[live] 상세 힌트만 남는다. 컨테이너가 `flex flex-wrap … gap-x-md` 라 항목 하나가 빠져도 간격·줄바꿈에 문제가 없다. 기존 "보정 데이터 없음" 경로와 같은 렌더 | 통과 |
| 3-b 호출처 3곳이 훅을 거치는지 | `git grep -n "useConfidenceCalibration\|useQueryScorecardCalibration\|fetchScorecardCalibration"` | 3곳 모두 도메인 훅 경유, 페칭 훅·어댑터 직접 import 0 | `AIAnalysisPanel.tsx:92`, `SavedDecisionView.tsx:43`, `ProdAnalysisQueueCard.tsx:139` 가 모두 `useConfidenceCalibration()`. `useQueryScorecardCalibration` 을 부르는 곳은 도메인 훅 1곳, `fetchScorecardCalibration` 을 부르는 곳은 페칭 훅 1곳뿐 | 통과 |
| 4 사용자 노출 카피 전수 점검 | 아래 "카피 점검" 절 | 비관리자 화면에 집계 적중률·승률·수익 보장·정확도 주장 0 | 비관리자에게 보이던 집계 적중률은 이번 PR 로 막힌 배지 (`calibrationHitRateText`·`CALIBRATION_BASIS`) 하나였다. 나머지는 관리자 전용이거나, 주장이 아닌 고지·개별 채점 결과 | 통과 (관찰 2·3) |
| 5-a typecheck | `npx tsc --noEmit` | 0 에러 | exit 0, 출력 없음 | 통과 |
| 5-b lint (변경 파일) | `npx eslint <변경 3파일>` | 0 | exit 0, 출력 없음 | 통과 |
| 5-c vitest | `npx vitest run app/api/scorecard hooks lib/server/scorecard` | 전부 통과 | **16 files / 187 tests passed** (`app/api/scorecard/calibration/__tests__/route.test.ts (2 tests)` 포함), exit 0 | 통과 |
| 5-d build | `npx next build` | 성공 | `✓ Compiled successfully`, 라우트 트리에 `ƒ /api/scorecard/calibration`, exit 0 | 통과 |

## 라이브 확인 (next start -p 3394, `.env.local`)

방금 빌드한 결과물을 3394 포트로 띄웠다. `APP_AUTH_SECRET` 으로 `signIdentitySession({sub:"qa394-nonexistent-sub", role:"user"})` 토큰을 `/tmp` 임시 tsx 스크립트로 만들어 `app_auth` 쿠키로 보냈다. 확인 후 서버를 내리고 스크립트를 지웠다.

| 요청 | calibration | summary | 비고 |
|---|---|---|---|
| 쿠키 없음 | 401 `{"error":"unauthorized"}` | 401 | proxy 로그인 게이트가 먼저 막음 (변경 전과 같음) |
| 위조 쿠키 | 401 | 401 | HMAC 검증에서 실패 |
| 일반 등급 서명 세션 | **403** `{"error":"forbidden"}`, `cache-control: no-store` | **403** | 두 admin 라우트가 같은 응답. 같은 세션의 `/api/auth/me` 는 `{"authenticated":true,"role":null,…}` 를 줘서 → `isAdmin=false` → 클라 훅은 요청을 안 보낸다 |
| 구버전(v1 비밀번호) 세션 | 401 | 401 | 비밀번호 경로는 폐지돼 미인증으로 처리 (회귀 아님) |

관리자 200 은 실제 관리자 계정의 `sub` 가 있어야 해서 라이브로는 돌리지 않았다. 단위 테스트(AC 1-b)로 갈음했다.

## 카피 점검 (AC 4)

명령: `git grep -nE "적중률|승률|수익 ?보장|정확도|확률|기대 ?수익|보장|정확|적중" -- 'lib/copy/**' 'components/**' 'app/**'` (테스트·주석 제외 후 하나씩 확인)

| 위치 | 문구 | 노출 대상 | 판단 |
|---|---|---|---|
| `lib/copy/scorecard/labels.ts:100-114` `calibrationHitRateText`·`CALIBRATION_BASIS`·`calibrationInsufficientBasis` | "실측 적중률 N% (n=…)" | 이번 PR 이후 **관리자만** | 쓰는 곳은 `VerdictHero.tsx` 하나. 데이터는 admin 게이트된 훅/API 에서만 오므로 비관리자에게는 렌더되지 않음. 해소 |
| `lib/copy/scorecard/labels.ts` (`SCORECARD_PAGE_TITLE`, `COL_HIT_RATE*`, `HIT_RATE_NOTE`, 게이트 문구 등) | "판정 적중률", "적중률(초과)" | 관리자 | `/dashboard/scorecard` `page.tsx:22` 가 `hasServerRole("admin")` 이 아니면 `AccessDeniedView` 로 막고, API(`summary`)도 `requireAdminApi` |
| `lib/copy/profile/labels.ts:42` `MENU_SCORECARD` | "신호 성적표 (적중률 자가점검)" | 관리자 | `app/(main)/profile/page.tsx:71-77` 의 `adminItems` 에만 들어감 (DB 기준 role, 확인 실패 시 메뉴 닫음) |
| `components/intraday/IntradayMistakeNoteDashboard.tsx:168` · `lib/copy/intraday/mistakeNoteDashboard.ts:18` | "승률 …" | 관리자 (prod) | `/intraday/**` 는 prod 에서 admin 게이트 (`intraday/page.tsx:9`). 단타 영역. 같은 곳에 "수익 보장 아님" 고지가 있음 |
| `lib/copy/analyze/labels.ts:166-168,226` `CARD_CACHE_HIT`·`COL_CACHE_HIT` | "캐시 적중률" | 토큰 대시보드 (사용량 API 는 `requireProdAdminApi`) | LLM 프롬프트 **캐시** 적중률이다. 판정 예측 정확도 주장이 아님 |
| `lib/copy/analyze/labels.ts:66` `hit: "적중"` | `/analyze` 카드의 "1주 적중 / 2주 빗나감" | 일반 사용자 | 판정 **한 건**의 채점 결과다(정직성 표시). 집계 비율이나 예측력 주장이 아님 → PR 본문 "유지" 결정과 같은 판단 |
| `lib/copy/workbench/layoutCopy.ts:28`, `lib/copy/stock/intradayRead.ts:19,66`, `lib/copy/intraday/guideProduct.ts:16`, `lib/copy/intraday/mistakeNoteDashboard.ts:13` | "수익 보장을 의미하지 않습니다" 등 | 일반 / 관리자 | 보장을 **부정**하는 고지문. 위반 아님 |

비관리자 화면에서 집계 적중률·승률·수익 보장·예측 정확도를 **주장하는** 문구: **0건**.

## 에지 케이스

| 케이스 | 확인 방법 | 결과 |
|---|---|---|
| useMe 로딩 중 (isAdmin=false) | 코드 (AC 2-c) | 요청 안 보냄, 배지 없음. 관리자로 확정되면 그때 조회 |
| `/api/auth/me` 실패·미인증 | `useMe` 는 `data` 가 없으면 role null → isAdmin false | 요청 안 보냄. 화면은 비관리자와 같음 (안전한 쪽으로 실패) |
| 관리자 → 로그아웃 → 비관리자로 같은 탭 | `hooks/auth/useLogout.ts:32` `window.location.assign("/login")` 전체 이동 | QueryClient 가 새로 만들어져 관리자 때의 보정값 캐시가 남지 않는다 |
| 관리자가 강등됨 (세션 쿠키에 admin 이 남은 경우) | `requireAdminApi` 는 쿠키가 아닌 DB 등급을 본다 | API 는 403. 다만 클라 `useMe` 가 쿠키 role 을 쓰면 요청은 나가고 403 이 조용히 무시된다 (토스트 없음, AC 2-b). 화면은 배지 없음 |
| 스토어 미설정 (로컬 dev) | `apiGuard` 는 세션 role 로 대신 판정 | 관리자 세션이면 200 + `configured:false` 빈 배열 (변경 전과 같은 graceful 경로) |
| StrictMode 이중 마운트 | 같은 queryKey 단일 키 + `enabled` 게이트 | 비관리자는 0회. 관리자는 TanStack 이 중복 요청을 하나로 합침 |

## 해당 없음

- BE(FastAPI) 라운드트립 a~e·반응형 두 뷰포트: 이 PR 은 Supabase 기반 BFF 라우트와 클라 `enabled` 게이트만 바꾼다. 레이아웃·FastAPI 경로·뷰포트별 분기 변경이 없다. 비관리자 화면은 "배지 없음"인데, 이는 보정 데이터가 없을 때 원래 쓰던 렌더 경로다.
- DESIGN.md 토큰 동기화: 스타일 변경 없음.
- BFF 원칙: `git grep -nE "http://127\.0\.0\.1" -- app/` 에서 새로 생긴 건 없음 (변경 파일에 URL 직타 없음). 클라에서 `fetch(` 를 새로 쓴 곳 없음.

## 관찰 (실패 아님)

1. **관리자 200 라이브 미실행**: 실제 관리자 `sub` 가 필요해서 라이브로는 비관리자 403 만 확인했다. 관리자 경로는 단위 테스트와 코드 추적(게이트 통과 후 본문은 변경 전과 같음)으로 확인했다. 머지 후 관리자 계정으로 AI 분석 패널 배지가 그대로 나오는지 한 번 육안 확인을 권한다.
2. **AI 프롬프트 피드백 주입 경로**: `app/api/stock/ai-analysis/route.ts:589` 의 `buildScorecardFeedbackSummary` 는 집계 적중률을 프롬프트에 넣을 수 있다. `isScorecardFeedbackPromptEnabled` 플래그 뒤에 있고 서버 안에서만 쓰이며 사용자 카피가 아니라 이번 범위 밖이다. 다만 켜면 모델이 본문에 "적중률 N%" 를 인용할 수 있으니 조건 5를 볼 때 이 경로도 함께 보면 된다.
3. **개별 "적중/빗나감" 표시**: `/analyze` 카드의 판정별 채점 결과는 일반 사용자에게 보인다. 집계·예측력 주장이 아니라 통과로 봤다 (PR 본문 "점검했지만 유지"와 같은 판단). 오픈베타 조건 5의 해석이 "적중이라는 단어 자체 0" 이라면 다시 판단해야 한다.

## 판정

**qa-passed** — AC 1~5 모두 통과, 실패 0건. PR 본문에 `## 다음 작업` 절이 있음 (라벨 게이트 충족).
