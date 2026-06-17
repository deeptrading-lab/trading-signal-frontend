# QA 리포트 — ai-sentiment-summary-surface

- **대상 PR**: #125 (`feature/ai-sentiment-summary-surface`, main 대비 2커밋)
- **성격**: PRD 없는 경량 UX 폴리시 + 헤더 버그 1건 (#124 구조화 감성의 후속)
- **검증 일자**: 2026-06-17
- **종합 판정**: **PASS** (블로커 0건 / 실패 0건 / 사전존재 known-fail 1건 — 본 PR 무관)

## 변경 요약

| 분류 | 파일 | 변경 |
|---|---|---|
| feat | `components/stock/ai-analysis/AnalystCard.tsx` | done+`sentiment.summary` 시 미리보기를 summary 한 줄(결론 톤 `font-medium`)로, 없으면 previewText 폴백. onExpand 3번째 인자 `highlight=summary` 전달 |
| feat | `components/stock/ai-analysis/CardDetailOverlay.tsx` | `highlight` prop 추가 — 있을 때만 상단 콜아웃(라벨+요약) 렌더 후 원문 마크다운 |
| feat | `components/stock/AIAnalysisPanel.tsx` | `expandedCard`에 `highlight?` 추가, `handleExpand(title, content, highlight?)`, social 카드에만 `sentiment` 전달 |
| feat | `lib/copy/stock/aiAnalysis.ts` | `sentiment.summaryLabel = "심리 한 줄 요약"` |
| fix | `components/layout/HeaderMarketTicker.tsx` | 그룹 구분선 조건 `t.code === "SPX"` → `"S&P 500"` (실데이터 code 매칭) |

---

## 1. 품질 게이트

| # | 명령 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 1-1 | `npm run typecheck` (`tsc --noEmit`) | 0 에러 | 0 에러 (출력 없음) | PASS |
| 1-2 | `npm run lint` (`eslint .`) | 0 에러 | 0 에러 (출력 없음) | PASS |
| 1-3 | `npm run build` | 성공 | 빌드 완료, 전 라우트 생성 | PASS |
| 1-4 | `npm run test` (vitest) | 본 변경 무관 통과 | 39 passed / **1 failed** / 1 skipped (256 pass, 1 fail) | PASS* |

\* 1-4 의 단일 실패 = `app/api/market/indices/__tests__/route.test.ts > "전부 실패 → 502 + 한글 fallback"` (`expected 200 to be 502`). **본 PR 무관 사전존재 known-fail** — 아래 §6 대조로 확인.

---

## 2. summary 미리보기 로직 (AnalystCard) — 코드 경로 정적 검증

핵심 분기 (`AnalystCard.tsx:39-42`, `105-114`):

```ts
const previewText = displayText ? stripMarkdown(displayText) : displayText;
const summary = sentiment?.summary?.trim() || undefined;
const donePreview = isDone && summary ? summary : previewText;
```

| # | 재현 (코드 경로) | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 2-1 | social done + `sentiment.summary` 존재 | summary 한 줄 노출, `font-medium` + `text-slate-700/200` | `donePreview = summary`, `summary` truthy → 진한 톤 className 적용 | PASS |
| 2-2 | social done + `sentiment.summary` 공백/없음 | previewText 폴백, 기존 톤 | `summary = undefined`(trim || undefined) → `donePreview = previewText`, `text-slate-600/300` | PASS |
| 2-3 | streaming 중(`isActive`) | summary 무영향 | `donePreview`는 `isDone && summary` 가드 → active 분기(`97-104`)는 `previewText`만 사용 | PASS |
| 2-4 | social 외 카드(market/news/fundamentals/trader/research_manager/risk_*) | summary 무영향 | `AIAnalysisPanel:447` `sentiment={key === "social" ? sentiment : undefined}` — 그 외 인스턴스(L482/495/525)는 sentiment 미전달 → `summary` 항상 undefined → previewText | PASS |
| 2-5 | sentiment prop 자체 없음(타입 `SentimentReport \| null \| undefined`) | 폴백 | optional chaining `sentiment?.summary?.trim()` 안전 | PASS |

**전체보기 버튼 시그니처**: `onExpand(meta.label, displayText, summary)` (`L82`) — summary undefined 시 highlight=undefined 로 전달, overlay 콜아웃 미렌더로 귀결(§3).

---

## 3. 전체보기 콜아웃 (CardDetailOverlay)

분기 (`CardDetailOverlay.tsx:49`): `{highlight && (<콜아웃/>)}` 후 항상 `<ReactMarkdown>{content}</ReactMarkdown>`.

| # | 재현 (코드 경로) | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 3-1 | `highlight` 존재 | 라벨(`COPY.sentiment.summaryLabel`) + 요약 콜아웃 → 원문 마크다운 | `highlight` truthy → 콜아웃 div + `MessageSquareQuote` 아이콘 렌더 | PASS |
| 3-2 | `highlight` 없음 | 콜아웃 미렌더, 기존과 동일 | `highlight && (...)` falsy → 마크다운만 | PASS |
| 3-3 | DebateMsgCard/DebateSection onExpand(2-arg) | 3번째 인자 없이 정상 | `onExpand: (title, content) => void` 선언이 `handleExpand`(3-arg) 받음 — 더 적은 파라미터 콜백을 넓은 시그니처에 할당 = TS 허용. 호출 시 highlight=undefined → 콜아웃 미렌더. typecheck 0에러로 확정 | PASS |
| 3-4 | 라벨 한글 카피 위치 | `lib/copy` 경유 | `CardDetailOverlay:54` `{COPY.sentiment.summaryLabel}` → 인라인 한글 0 | PASS |

---

## 4. 헤더 fix 회귀 (HeaderMarketTicker)

실데이터 `lib/mock/layout/marketTickers.ts` codes: `KOSPI`, `KOSDAQ`, `S&P 500`, `NASDAQ`, `BTC`. 렌더는 `t.code` 를 라벨로 직접 출력(`L80`).

| # | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 4-1 | 그룹 구분선 조건 | S&P 500·BTC 앞 굵은 구분선(`w-0.5 bg-text-muted` = 국내\|미국\|코인 그룹 경계) | 조건 `t.code === "S&P 500" \|\| "BTC"` 가 실 code 매칭 → 의도대로 작동(기존 "SPX"는 불일치라 경계 미표시 버그였음) | PASS |
| 4-2 | KOSPI/KOSDAQ/NASDAQ 구분선 | 얇은 구분선(`w-px bg-border-line`) | 비매칭 → else 분기 유지, 회귀 없음 | PASS |
| 4-3 | 라벨/값/등락 렌더 | 회귀 없음 | `t.code`/`t.value`/`changePct` 출력 로직 미변경 | PASS |
| 4-4 | DEFAULT_INDEX_CODES "SPX" 영향 | 무관 | `lib/api/market/indices.ts:25` 의 "SPX"는 원시 지수 API 레이어 — 헤더 티커 mock 과 별개, 본 fix 영향 없음 | PASS |
| 4-5 | 헤더 전용 자동 테스트 | — | HeaderMarketTicker 단위 테스트 없음(mock 기반 presentational). 정적 검증으로 대체 | N-A |

---

## 5. 접근성·토큰 무회귀

| # | 항목 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 5-1 | hex 직타 | 0 | 신규 diff hex `#` 0건 | PASS |
| 5-2 | 명명 max-w(xs/sm/md) | 0 | 0건 | PASS |
| 5-3 | 다크모드 변형 | 콜아웃·미리보기 dark: 존재 | CardDetailOverlay dark: 17건, AnalystCard 미리보기 `dark:text-slate-200/300` 분기 존재 | PASS |
| 5-4 | `cn` 헬퍼 | 합성 className에 사용 | AnalystCard L106 `cn(...)`, 기존 패턴 유지 | PASS |
| 5-5 | 인라인 한글 | 0 (코드 주석 제외) | 컴포넌트 diff 내 사용자노출 한글 0, 신규 한글은 전부 주석. 라벨은 `COPY.sentiment.summaryLabel` | PASS |
| 5-6 | slate-* 유틸 팔레트 | 신규 토큰 위반 아님 | 동일 컴포넌트 family pre-PR 이미 slate/blue 유틸 12~13건 사용 — 기존 컨벤션 답습, 신규 위반 아님 | PASS |
| 5-7 | 콜아웃 시맨틱 | 의미 전달 | `MessageSquareQuote` 아이콘 + uppercase 라벨 + 본문 텍스트 구조, 키보드 인터랙션 무관(정보 표시 영역) | PASS |

---

## 6. 무회귀 + 사전존재 실패 대조

| # | 항목 | 결과 |
|---|---|---|
| 6-1 | #124 SSE/배지/폴백 경로 | PR diff가 `SentimentBadge`/SSE/route 파일을 **전혀 건드리지 않음**(`git diff --name-only` 확인). 배지는 `AnalystCard:92` 그대로, summary는 미리보기에 **추가** 표시일 뿐 배지 대체 아님 → 무회귀 |
| 6-2 | indices 테스트 사전존재 실패 | clean `main` worktree 에서 동일 테스트 단독 실행 → **1 failed \| 7 passed**, 동일 assertion `expected 200 to be 502`. PR diff는 indices 파일 0건. → **본 PR 무관 known-fail 확정** |

**사전존재 실패 상세**: `app/api/market/indices/__tests__/route.test.ts:115` — "이중 게이트 통과 + 전부 실패 → 502 + 한글 fallback" 이 502 대신 200 반환. main·feature 양쪽 동일 재현. market/indices 라이브 네트워크/폴백 동작 관련 기존 known-fail로, 본 PR 변경과 무관.

---

## 7. 에지 케이스

| 케이스 | 처리 | 판정 |
|---|---|---|
| `summary` 빈 문자열/공백만 | `.trim() \|\| undefined` → previewText 폴백 | PASS |
| `summary` 있음 + done | 결론 톤 한 줄 노출 + 전체보기 콜아웃 | PASS (정적) |
| `highlight` 없는 일반 카드 전체보기 | 콜아웃 미렌더, 기존 마크다운만 | PASS |
| social 외 카드(market/news/fundamentals/trader/risk_*) | sentiment 미전달 → summary 로직 비활성 | PASS |
| Debate 카드 전체보기(2-arg onExpand) | highlight undefined, 정상 | PASS (typecheck) |
| sentiment=null/undefined | optional chaining 안전 | PASS |
| 헤더 code 비매칭(KOSPI 등) | else 얇은 구분선 유지 | PASS |

---

## 8. 환경 제약 (정직 표기)

| 항목 | 사유 | 대체 |
|---|---|---|
| 실 LLM 라운드트립(미리보기 summary 실렌더) | claude CLI full run 필요 — 본 QA 환경 불가 | **N-A(환경제약)** → §2 코드 경로 정적 검증 |
| 전체보기 콜아웃 실렌더 | 동상 | **N-A(환경제약)** → §3 정적 검증 |
| 반응형 두 뷰포트 실측(모바일375/데스크탑1280) | 동상(분석 패널은 LLM 스트림 의존) | **N-A(환경제약)** — 본 PR은 레이아웃 그리드 미변경, 콜아웃은 기존 overlay 컨테이너 내부 |

라운드트립 미수행 사유: AI 분석 패널의 summary/콜아웃 노출은 실 LLM 스트림 done + 구조화 감성 파싱이 선행돼야 화면 검증 가능. claude CLI full run 불가 환경이라 정적 코드 경로 + 자동 게이트(typecheck/lint/build/test)로 대체 검증.

---

## 종합

- **자동 게이트**: typecheck/lint/build PASS, test = 1 known-fail(본 PR 무관, main 동일 재현) 외 256 pass.
- **로직**: summary 미리보기 폴백, 콜아웃 조건부 렌더, social 한정 sentiment 전달, 2-arg/3-arg onExpand 호환 모두 정합.
- **헤더 fix**: 실데이터 code "S&P 500" 매칭으로 그룹 구분선 정상화, 타 티커 회귀 없음.
- **토큰/접근성/한글**: 신규 위반 0, 기존 컨벤션 답습.
- **#124 무회귀**: SSE/배지/route 파일 미변경으로 구조적 무회귀.

**판정: PASS** — 라이브 LLM 라운드트립은 환경제약 N-A.

### 잔여 리스크
1. summary 실렌더·콜아웃·반응형은 정적 검증만 수행(환경제약) — 머지 후 preview/prod에서 실 LLM 1회 육안 확인 권장.
2. indices route 502 테스트는 사전존재 known-fail로 별도 트랙에서 처리 필요(본 PR 범위 외).
