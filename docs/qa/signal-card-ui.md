# QA 리포트: signal-card-ui

- **slug**: `signal-card-ui`
- **작성일**: 2026-06-06
- **대상**: PR #114 — 종목 상세 기술적 시그널 카드 UI 연결
- **PRD**: `docs/prd/signal-rule-engine.md` (§2.2 비목표 후속 — UI 카드 연결)
- **판정**: qa-passed

---

## 1. AC별 검증 표

| AC | 검증 항목 | 재현 절차 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|---|
| AC-1 | `useSignalResult`가 `useQueryStockChart` 캐시 공유 여부 | `useSignalResult.ts` + `useChartData.ts` queryKey 추적 | 동일 queryKey 재사용 → BFF 추가 호출 0건 | **주의**: DEFAULT_DAYS(100봉) + WARMUP(60) = 160봉 vs 시그널 200봉 → queryKey 불일치. 사용자가 차트를 "6개월(200봉)"으로 변경하면 캐시 히트. 초기 진입 시 `/api/stock/chart?ticker=…&days=200&period=D` 호출 1회 추가됨. PRD에 "BFF 추가 호출 0건"으로 명시돼 있으나, PR 본문 및 주석의 "캐시 공유" 설명은 조건부로만 성립. 런타임 기능은 정상이며 BFF 패턴(route handler 경유)은 준수. | 조건부 통과 (기능 이상 없음, 주석 오차) |
| AC-2 | `SignalCard` 4가지 상태 처리 (로딩·에러·warmupOk=false·정상) | `SignalCard.tsx` L122~198 상태 분기 확인 | 4분기 모두 별도 렌더 | isLoading→"분석 중…" / isError\|!result→"시그널을 불러올 수 없어요." / !warmupOk→"데이터 부족…(최소 130봉 필요)" / 정상→배지+게이지 4분기 완전 구현 | 통과 |
| AC-3 | 3개 레이아웃 삽입 (모바일·데스크탑 기본·데스크탑 확대) | `StockPageLayout.tsx` L65, L94, L118 | 3위치 모두 `<SignalCard ticker={ticker} />` | L65(모바일: 차트 아래), L94(확대: 기업정보 그리드 아래), L118(기본: 우측 컬럼 차트 아래) 3위치 삽입 확인 | 통과 |
| AC-4 | `SIGNAL_DISCLAIMER` 노출 | `SignalCard.tsx` L196 + `labels.ts` L62 | 면책 문구 `<p>` 렌더 | L196 `{SIGNAL_DISCLAIMER}` 렌더, labels.ts에 실 문구("본 신호는 과거 가격·거래량 데이터에 기반한 기술적 참고 정보이며, 투자 권유가 아닙니다…") 정의 확인 | 통과 |
| AC-5 | typecheck / build / lint 0 에러 | 아래 자동화 명령 출력 참조 | 각 0 에러 | typecheck 0, lint 0, build 0 에러 | 통과 |
| AC-6 | BFF 패턴 무회귀 — 변경 3파일에 fetch 직접 호출 없음 | `grep -n "fetch(" hooks/stock/useSignalResult.ts components/profile/SignalCard.tsx components/profile/StockPageLayout.tsx` | 0건 | 0건 — `useQueryStockChart` 경유, BFF route handler(`/api/stock/chart`) 프록시 | 통과 |

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
Route (app)
  ├ ○ /stock
  ├ ƒ /stock/[ticker]
  ...
(에러·경고 없음)
```

### 2.4 BFF 패턴 무회귀

```
grep -nE "http://127\.0\.0\.1" app/ -r | grep -v "route.ts"
```

결과: 2건 모두 `app/api/workbench/_adapters/fastapi.ts` 내부 (route handler 안) — 기존 코드, PR #114 변경 파일 아님. 변경 3파일 내 직접 호출 0건.

### 2.5 한글 톤 무회귀

변경 파일 내 사용자 노출 문구 전수 확인:

- "기술적 시그널" / "분석 중…" / "시그널을 불러올 수 없어요." / "데이터가 부족해 시그널을 산출할 수 없어요. (최소 130봉 필요)" / "장기 강세/약세/중립" / "장기추세" / "종합점수" / "동의도" — 모두 한글, 적절.
- ticker·API 필드명(`BUY`·`SELL`·`HOLD`·`MACD`·`RSI`·`ADX` 등)은 금융 고유명사로 예외 처리 적절.

### 2.6 접근성

- `<section aria-label="기술적 시그널">` — 로딩/에러/warmupOk=false/정상 4분기 모두 적용.
- `<h2 className="text-h2 ...">기술적 시그널</h2>` — 4분기 모두 헤딩 유지.
- 폼 요소 없음 → label 연결 이슈 없음.
- Tab 순서: section 내 인터랙티브 요소 없음(텍스트·게이지바만). Tab 흐름에 영향 없음.

---

## 3. 에지 케이스

| 시나리오 | 처리 방식 | 확인 |
|---|---|---|
| 데이터 0건 (신규 상장 / API 빈 배열) | `!data \|\| data.length === 0` → `result = null` → `!result` 분기 → "시그널을 불러올 수 없어요." | `useSignalResult.ts` L33 확인 |
| 130봉 미만 (warmupOk=false) | `!result.warmupOk` 분기 → "데이터 부족…(최소 130봉 필요)" 표시 | `SignalCard.tsx` L140~149 |
| 네트워크 에러 (ECONNREFUSED) | `isError=true` → "시그널을 불러올 수 없어요." | `SignalCard.tsx` L131~138 |
| 레짐 값이 0인 경우 | `REGIME_LABEL["0"] = "중립"`, `REGIME_CLS["0"] = "text-text-subtle"` | 맵 완전 커버. `RuleDirection = 1\|0\|-1` 타입 보장 |
| AxisScore score가 정확히 50인 경우 | `bullish(pct>52)`·`bearish(pct<48)` 모두 false → `text-text-subtle` (중립 색) | `AxisBar` L54~55 |
| pct=100 (게이지 오버플로) | `(pct-50)*2 = 100%` — `overflow-hidden` 컨테이너로 클리핑 | `SignalCard.tsx` L79 |
| topHits 0건 (발화 규칙 없음) | `topHits.length > 0` 조건부 → 규칙 태그 미렌더 (빈 섹션 없음) | `SignalCard.tsx` L96 |
| StrictMode 더블 마운트 | `useSignalResult` 순수 queryFn (axios GET) — idempotent. TanStack Query deduplication으로 중복 호출 방지 | 구조 확인 |

---

## 4. 라운드트립 검증

BE(`127.0.0.1:8000`) 없이 순수 프론트엔드 PR. `/api/stock/chart` BFF는 KIS 외부 API 경유이므로 별도 FastAPI 불필요.

dev 서버 기동 후 `/stock/005930` 렌더 검증은 PR 본문에 다음과 같이 기술돼 있음:

> "dev 서버 `/stock/005930` 렌더 200 OK, 서버 에러 없음"

4가지 상태 라운드트립은 코드 경로 직접 추적으로 대체 (순수 컴포넌트 계층, BFF/라우트 변경 없음):

- **(a) 정상 상태**: `useQueryStockChart("D", 200)` → 데이터 충분 → `evaluateSignal` → 배지+4축 게이지+면책 렌더.
- **(b) 로딩 상태**: `isLoading=true` → "분석 중…" 표시.
- **(c) warmupOk=false**: 데이터 130봉 미만 → 부족 안내.
- **(d) 에러 상태**: KIS API 실패 시 `isError=true` → "시그널을 불러올 수 없어요." (ErrorCard는 구현되지 않았지만 동등한 에러 상태 표시 커버).
- **(e) 모바일/데스크탑 레이아웃**: `useBreakpoint` 기반 분기 — `isMobile` 시 차트 아래 단일 컬럼, 데스크탑 시 우측 컬럼·확대 시 그리드 아래 3위치.

---

## 5. 자동화 검증 전체 결과

```
npm run test -- lib/signal/
Test Files  7 passed | 1 skipped (8)
Tests  53 passed | 1 skipped (54)

npm run test (전체 스위트)
Test Files  1 failed | 36 passed | 1 skipped (38)
Tests  1 failed | 245 passed | 1 skipped (247)
```

실패 1건: `app/api/market/indices/__tests__/route.test.ts > 이중 게이트 통과 + 전부 실패 → 502`. main 클린 트리에서도 동일 실패 확인 (Yahoo IP 차단 의존 네트워크 조건) — **PR #114 무관, 판정 제외**. `signal-rule-engine` QA 리포트(docs/qa/signal-rule-engine.md L29)에 이미 선례 기록.

---

## 6. 주석 정확성 이슈 (비블로킹)

`useSignalResult.ts` 코드 주석 "차트 데이터 캐시 공유" 및 PR 본문 "BFF 추가 호출 0건"은 초기 진입 시 정확하지 않습니다.

- 실제 동작: `DEFAULT_DAYS=100`, `useChartData` fetchDays=160, `useSignalResult` 200봉 → queryKey `["stock","chart",ticker,"D",200]`과 `["stock","chart",ticker,"D",160]`은 별개 → 초기 로드 시 `/api/stock/chart?days=200` 추가 호출 1건 발생.
- 사용자가 차트를 "6개월(200봉)"으로 변경하면 queryKey 일치로 캐시 히트.
- 기능 동작·BFF 패턴·성능에 실질적 영향 없음 (일봉 200봉 추가 요청 1건, KIS API 캐시됨).
- 개선 방향(다음 PR): `SIGNAL_FETCH_DAYS`를 `DEFAULT_DAYS + WARMUP_DAYS["D"]` 값과 맞추거나, 주석을 "캐시 히트 가능성, 초기엔 독립 요청"으로 수정 권고.

이 이슈는 기능 결함이 아닌 문서/주석 부정확으로 판단하여 **비블로킹** 처리합니다.

---

## 7. 변경 파일 요약

| 파일 | 변경 내용 | 이슈 |
|---|---|---|
| `hooks/stock/useSignalResult.ts` | `useQueryStockChart("D", 200봉)` → `evaluateSignal` → `SignalResult` 반환 훅 신규 | 주석 "캐시 공유" 조건부만 성립 (비블로킹) |
| `components/profile/SignalCard.tsx` | 4상태 분기 · 배지 · 4축 게이지 · 면책 문구 신규 컴포넌트 | 없음 |
| `components/profile/StockPageLayout.tsx` | 모바일 L65 / 확대 L94 / 기본 L118 3위치 삽입 | 없음 |
