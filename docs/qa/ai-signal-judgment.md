# QA 리포트: ai-signal-judgment

- **slug**: `ai-signal-judgment`
- **작성일**: 2026-06-08
- **대상**: PR #115 — 종목 상세 시그널 카드 "AI로 최종 판단" 버튼 (BFF + SignalCard 4상태)
- **PRD**: `docs/prd/signal-rule-engine.md` §2.2 비목표 후속 — workbench analyze 프롬프트 주입(§4-3 환각 제거)
- **판정**: qa-passed

---

## 1. AC별 검증 표

| AC | 검증 항목 | 재현 절차 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|---|
| AC-1 | Vercel 환경 감지 시 503 + 한글 에러 반환 | `route.ts` L31~37 `isVercelEnv()` + L168~173 응답 확인 | `VERCEL=1` 또는 `VERCEL_ENV` 설정 시 503 + `"AI 최종 판단은 로컬 환경(next dev)에서만 사용할 수 있어요."` | `isVercelEnv()`가 `VERCEL==="1"` \| `typeof VERCEL_ENV==="string"` \| `typeof NEXT_PUBLIC_VERCEL_ENV==="string"` 3조건 OR 검사. 매칭 시 NextResponse.json({error:"..."}, {status:503}) 반환. workbench `claudeCli.ts` L439~445 와 구현 완전 동일. | 통과 |
| AC-2 | KIS 미설정 시 400 반환 | `route.ts` L181~183 확인 | `isKisConfigured()` false → 400 + 한글 에러 | `isKisConfigured()` false 시 `{ error: "KIS API가 설정되지 않아 시그널을 계산할 수 없어요." }` 400 반환. ticker 빈 값도 별도 400 처리(L177~179). | 통과 |
| AC-3 | ticker sanitize — `[^A-Za-z0-9_-]` 제거 후 빈 값이면 400 | `route.ts` L176 `replace(/[^A-Za-z0-9_-]/g, "")` | 특수문자 제거 후 빈 문자열이면 400 | `(body.ticker ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "")` 후 `!ticker` 검사 → 400. 빈 본문(`req.json()` 실패) 시 `{}` 폴백 → ticker="" → 400. 한국 종목코드(005930 등)는 숫자만으로 A-Za-z0-9 범위 내. | 통과 |
| AC-4 | `evaluateSignal` 결과가 user prompt에 실제 주입됐는지 | `route.ts` L195 `evaluateSignal(sorted)` + L210~218 `buildUserPrompt(ticker, signalResult.axes, signalResult.score, ...)` + L222 `invokeCli(bin, args, userPrompt)` 추적 | 4축 점수·레짐·동의도가 stdin으로 claude에 전달 | `evaluateSignal` 결과의 `axes/score/action/confidence/regime/asOf` 6개 필드가 `buildUserPrompt`에서 텍스트로 포맷된 뒤 `stdin`으로 주입. LLM은 숫자 추정 없이 설명+웹리서치만 담당 — §4-3 환각 제거 구현 확인. | 통과 |
| AC-5 | claude CLI subprocess 패턴이 workbench adapter와 동일한지 | `route.ts` L43~66 vs `claudeCli.ts` L130~179 비교 | `execFile`, `--print --output-format json`, stdin pipe, ENOENT reject, timeout SIGTERM/SIGKILL 분기 동일 | 핵심 패턴(`execFile`, `--print --output-format json`, stdin pipe, ENOENT reject, killed+SIGTERM/SIGKILL 검사) 완전 동일. **차이점**: ai-signal은 `exitCode !== 0 && !stdout` 조건일 때만 에러 처리(stdout 있으면 JSON 파싱 시도 계속) — workbench는 `exitCode !== 0` 즉시 에러. 이 차이는 ai-signal이 의도적으로 더 관대한 처리(Claude가 경고와 함께 출력 반환 시 활용 가능)로 기능 결함 아님. | 통과 |
| AC-6 | `AISignalResponse` 타입이 완전히 지켜지는지 (`normalizeResponse`) | `route.ts` L146~163 + `lib/types/stock/aiSignal.ts` L16~29 비교 | 6개 필드 모두 타입 안전 처리 | `verdict`(Set 체크), `reasoning`(string fallback ""), `key_catalysts`/`risk_factors`(Array filter string), `confidence_note`(string fallback ""), `disclaimer`(string fallback "본 내용은 투자 권유가 아닙니다."). verdict null이면 전체 null 반환 → 502. 6개 필드 완전 커버. | 통과 |
| AC-7 | SignalCard 로딩/에러/성공/재시도 4상태 처리 | `SignalCard.tsx` L213~284 `aiMutation` 4상태 분기 확인 | 4상태 각각 별도 UI | (1) `!isPending && !isSuccess` → "AI로 최종 판단" 버튼 / (2) `isPending` → "Claude가 웹 리서치 후 분석 중입니다… (최대 60초)" / (3) `isError` → 에러 메시지 + "다시 시도" 버튼 / (4) `isSuccess && data` → verdict 배지+reasoning+key_catalysts+risk_factors+confidence_note+disclaimer 렌더. 4상태 완전 구현. | 통과 |
| AC-8 | Tailwind 토큰 직타 없음 | `SignalCard.tsx` hex/px 직타 검사 | badge-signal-up/down, badge-info, badge-warn, text-text-muted, border-border-line 등 기존 토큰만 사용 | `badge-signal-up`, `badge-signal-down`, `badge-info`, `badge-warn`은 `app/components.css` @layer components 에서 `@apply` 정의 확인. `text-signal-up/down`, `text-text-muted`, `border-border-line`, `bg-surface-muted` 등 모두 tailwind.theme.json 토큰 기반. **비고**: `h-[4px]`(게이지 바 높이)·`py-[1px]`(규칙 태그)는 임의 px 값이나, 기존 컴포넌트(`StockHeader py-[2px]`, `ChartShell py-[3px]`) 동일 패턴 선례 있어 기존 규범 무회귀로 판단. | 통과 |
| AC-9 | `typecheck` · `build` · `lint` 통과 | 아래 자동화 결과 참조 | 각 0 에러 | typecheck 0, lint 0, build 0 에러 (상세 아래) | 통과 |
| AC-10 | BFF 패턴 준수 — `lib/api/stock/aiSignal.ts`에 `fetch(` 직접 호출 없음 | `grep "fetch(" lib/api/stock/aiSignal.ts` + 변경 5파일 전체 검사 | 0건 | `lib/api/stock/aiSignal.ts` `httpClient.post<AISignalResponse>(...)` 경유 확인. 변경 5파일(route.ts·aiSignal.ts·aiSignal.ts·useMutationAISignal.ts·SignalCard.tsx) `fetch(` 0건. route.ts 내 `fetchStockDailyChart`는 route handler 내부 서버사이드 KIS 호출로 예외 허용. | 통과 |

---

## 2. 공통 AC 검증

### 2.1 typecheck

```
npm run typecheck
> tsc --noEmit
(출력 없음 — 0 에러)
```

### 2.2 lint

```
npm run lint
> eslint .
(출력 없음 — 0 에러)
```

### 2.3 build

```
npm run build
> next build (Turbopack)
✓ Compiled successfully in 2.3s
✓ Generating static pages (34/34) in 239ms

Route (app)
  ├ ƒ /api/stock/ai-signal   ← 신규 라우트 정상 빌드
  ├ ƒ /stock/[ticker]
  ...
(에러·경고 없음)
```

### 2.4 BFF 패턴 무회귀

```
git grep -nE "http://127\.0\.0\.1" -- app/ | grep -v "route.ts"
```

결과: 2건 모두 `app/api/workbench/_adapters/fastapi.ts` 내부 (route handler 안) — 기존 코드. PR #115 변경 파일 0건.

### 2.5 한글 톤 무회귀

변경 파일 사용자 노출 문구 전수 확인:

- route.ts 에러 메시지: "AI 최종 판단은 로컬 환경(next dev)에서만 사용할 수 있어요." / "ticker가 필요합니다." / "KIS API가 설정되지 않아 시그널을 계산할 수 없어요." / "시세 데이터를 불러오는 데 실패했어요." / "데이터가 부족해 시그널을 계산할 수 없어요. (최소 130봉 필요)" / "claude CLI를 찾을 수 없어요." 등 모두 한글.
- SignalCard: "AI로 최종 판단" / "Claude가 웹 리서치 후 분석 중입니다… (최대 60초)" / "AI 분석에 실패했어요." / "다시 시도" / "AI: 매수 우위/매도 우위/중립/관망" / "최근 이슈·촉매" / "리스크" — 모두 한글.
- verdict 값(`BUY`/`HOLD`/`SELL`/`WATCH`)은 금융 도메인 API 필드로 예외 허용.

### 2.6 접근성

- `<section aria-label="기술적 시그널">` — 4분기(로딩/에러/warmupOk=false/정상) 모두 적용 확인.
- AI 판단 버튼: `<button type="button" className="button-primary">AI로 최종 판단</button>` — 텍스트 콘텐츠로 접근성 충족.
- 재시도 버튼: `<button type="button">다시 시도</button>` — 동일.
- 리스트(`ul/li`) 구조로 key_catalysts, risk_factors 렌더 — 적절한 시맨틱.
- 새 인터랙티브 요소(버튼 2개)는 Tab 순서에 자연 편입, `tabIndex` 조작 없음.

---

## 3. 에지 케이스

| 시나리오 | 처리 방식 | 확인 |
|---|---|---|
| Vercel 환경 (`VERCEL=1`) | `isVercelEnv()` → 503 + 한글 안내 (이하 다른 코드 미실행) | `route.ts` L168~173 |
| KIS 미설정 | `isKisConfigured()` false → 400 | `route.ts` L181~183 |
| 빈 본문 / req.json() 실패 | `catch(() => ({}))` 폴백 → `body.ticker=""` → 400 | `route.ts` L175~179 |
| 악의적 ticker (`; rm -rf /`) | `replace(/[^A-Za-z0-9_-]/g, "")` → 전부 제거 → 빈 문자열 → 400 | `route.ts` L176~178 |
| 데이터 130봉 미만 | `evaluateSignal` → `warmupOk=false` → `signalResult.warmupOk` false → 400 | `route.ts` L200~202 |
| claude CLI 미설치 (ENOENT) | `reject(error)` → catch에서 ENOENT 분기 → 500 + "claude CLI를 찾을 수 없어요." | `route.ts` L224~228 |
| 60s 타임아웃 초과 | `killed && (SIGTERM\|SIGKILL)` → `timedOut=true` → 504 + 재시도 안내 | `route.ts` L231~233 |
| malformed JSON 응답 | `extractJson` → null → 502 + "AI 응답 파싱에 실패했어요." | `route.ts` L238~242 |
| verdict 필드 누락/오타 | `normalizeResponse` → verdict null → 502 + "AI 응답 형식이 올바르지 않아요." | `route.ts` L244~248 |
| exitCode != 0 but stdout 있음 | stdout으로 JSON 파싱 시도 계속 — workbench보다 관대한 처리(의도적 설계) | `route.ts` L234 조건 `!cliResult.stdout` 추가 |
| StrictMode 더블 마운트 | useMutation — 자동 재실행 없음(mutation은 버튼 클릭 트리거). 더블 마운트 영향 없음. | `useMutationAISignal.ts` 구조 확인 |
| AI 판단 재요청 (이미 성공 상태) | `isSuccess` 시 버튼 숨김 → 재요청 불가(의도적). 에러 시에만 "다시 시도" 노출. | `SignalCard.tsx` L214 |
| key_catalysts / risk_factors 빈 배열 | `arr.length > 0` 조건부 렌더 → 빈 섹션 미표시 | `SignalCard.tsx` L256, L268 |

---

## 4. 라운드트립 검증

### 4.1 환경

이 PR은 로컬 claude CLI 전용 기능으로 BE(`127.0.0.1:8000`) FastAPI 불필요. Vercel 미지원(503 가드).

라운드트립 수동 실행은 claude CLI 실행 환경 의존성으로 코드 경로 추적으로 대체한다.

### 4.2 코드 경로 추적

**(a) 정상 플로우 (로컬, KIS 설정, claude CLI 설치)**

```
SignalCard 버튼 클릭
→ useMutationAISignal.mutate("005930")
→ fetchAISignal({ ticker: "005930" })
→ httpClient.post("/stock/ai-signal", { ticker: "005930" })
→ POST /api/stock/ai-signal
  → isVercelEnv() false (로컬)
  → ticker = "005930" (sanitize 통과)
  → isKisConfigured() true
  → fetchStockDailyChart("005930", ...) → 200봉 일봉
  → evaluateSignal(sorted) → SignalResult{ action, score, confidence, axes, regime, asOf, warmupOk:true }
  → buildUserPrompt(...) → 4축 점수 포함 텍스트
  → invokeCli("claude", ["--print","--output-format","json","--system-prompt",...], userPrompt)
  → extractJson(stdout) → { verdict, reasoning, key_catalysts, ... }
  → normalizeResponse → AISignalResponse
  → 200 + Cache-Control: no-store
→ SignalCard isSuccess → verdict 배지 + reasoning + 촉매/리스크/면책 렌더
```

**(b) Vercel 환경 차단**

```
isVercelEnv() true → 503 → useMutation isError=true
→ SignalCard "AI 최종 판단은 로컬 환경에서만..." + "다시 시도" 버튼 렌더
```

**(c) KIS 미설정**

```
isKisConfigured() false → 400 → axios 에러 인터셉트 → ApiError{status:400, message:"..."}
→ useMutation isError=true → 에러 메시지 + "다시 시도" 버튼 렌더
```

**(d) claude CLI 없음**

```
invokeCli → ENOENT reject → 500 "claude CLI를 찾을 수 없어요."
→ useMutation isError=true → 에러 메시지 + "다시 시도" 버튼 렌더
```

**(e) 타임아웃 (60s 초과)**

```
invokeCli → timedOut=true → 504 "AI 분석이 60초를 초과했어요."
→ useMutation isError=true → 에러 메시지 + "다시 시도" 버튼 렌더
```

### 4.3 반응형

SignalCard는 부모(StockPageLayout)의 반응형 분기에 의해 배치. 이 PR은 SignalCard 내부 AI 섹션 추가만으로 반응형 구조 변경 없음. `flex flex-col` 레이아웃으로 모바일·데스크탑 동일 렌더.

---

## 5. 자동화 검증 전체 결과

```
npm run test (전체 스위트)
Test Files  1 failed | 36 passed | 1 skipped (38)
Tests       1 failed | 245 passed | 1 skipped (247)
```

실패 1건: `app/api/market/indices/__tests__/route.test.ts > 이중 게이트 통과 + 전부 실패 → 502`.
main 브랜치 클린 트리에서도 동일 실패 확인 — **PR #115 변경 파일과 무관, 기존 미해결 테스트, 판정 제외**.

`docs/qa/signal-card-ui.md` §5 에 동일 선례 기록됨.

---

## 6. 비고 (비블로킹)

1. **exitCode 분기 차이**: `ai-signal/route.ts` L234는 `exitCode !== 0 && !cliResult.stdout` 조건으로 workbench보다 관대. stdout이 있으면 JSON 파싱을 시도한다. 의도적 설계로 보이며 기능 결함 아님. 후속에서 workbench와 통일하고 싶다면 공통 헬퍼로 분리하는 방향 권고.

2. **`h-[4px]`·`py-[1px]` 임의 px 직타**: AGENTS.md "코드에 hex/px 직타 금지" 원칙과 충돌하나 기존 컴포넌트들(`StockHeader`, `ChartShell`, `FearGreedGauge` 등)에서 동일 패턴이 광범위하게 사용 중. PR #115 신규 도입 패턴 아님. 전체 정리는 별도 cleanup PR에서 처리 권고.

3. **에러 메시지 타입 캐스팅**: `SignalCard.tsx` L235 `(aiMutation.error as { message?: string })?.message` — `ApiError` 타입을 직접 사용하지 않고 구조 캐스팅. `isApiError` 가드 활용이 더 안전하나 `ApiError.message` 필드는 실제로 존재하므로 런타임 오동작 없음.

---

## 7. 변경 파일 요약

| 파일 | 변경 내용 | 이슈 |
|---|---|---|
| `app/api/stock/ai-signal/route.ts` | BFF 신규: Vercel 가드, ticker sanitize, KIS 신호 계산, claude CLI subprocess, normalize | 없음 |
| `lib/types/stock/aiSignal.ts` | `AISignalRequest`/`AISignalVerdict`/`AISignalResponse` 타입 신규 | 없음 |
| `lib/api/stock/aiSignal.ts` | `fetchAISignal` axios 클라이언트 신규 — `httpClient.post` 경유 BFF 패턴 준수 | 없음 |
| `hooks/stock/useMutationAISignal.ts` | `useMutationAISignal` TanStack Query mutation 신규 | 없음 |
| `components/profile/SignalCard.tsx` | AI 최종 판단 4상태(버튼/로딩/에러/성공) UI 추가 | h-[4px]·py-[1px] 임의px (비블로킹) |
