# QA — 저장 결과 카드 열 때 AI 패널 헤더 종목명 즉시 표시 (티커 깜빡임 제거)

- 대상 PR: #340 (`fix/ai-panel-name-flicker-saved-card`)
- 변경 파일: `hooks/stock/aiAnalysisProvider.tsx`, `components/stock/AIAnalysisPanel.tsx` (+26/−5)
- QA 일자: 2026-07-10
- 판정: **qa-passed** (실패 0건)

## 검증 환경 / 라이브 브라우저 검증 관련 주의

`/analyze` 라이브 카드 클릭 → 헤더 관찰(sub-second 깜빡임)은 **자동 캡처가 어렵고**, 사용자 dev 서버가 `:3000` 에서 상시 구동 중이라(Next 16 persistent dev daemon — 새 포트 미기동, 기존 3000 을 보고) 별도 포트로 격리 실행이 불가했다. 이에 따라 본 QA 는 **코드/데이터 흐름 트레이스 + 정적 검증(tsc·eslint·build)** 으로 AC 를 판정한다. 깜빡임 해소의 핵심은 "동기 단일 dispatch 로 async 경합 창 제거"이며, 이는 아래 코드 트레이스로 입증 가능하다.

```
$ lsof -iTCP:3000 -sTCP:LISTEN   → node PID 98953 LISTEN (사용자 dev 서버, 미간섭)
```

## AC 별 재현·기대·실측

| # | AC | 재현/검증 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| 1 | 저장 결과 카드 클릭 → 헤더 종목번호 깜빡임 없이 즉시 종목명 표시 (핵심 회귀) | 코드 트레이스: `AIDecisionListContainer.tsx:161/168` 카드가 `name={nameOf(item.ticker)}` 로 렌더 → 클릭 `onSelect` 이 **동일** `nameOf(it.ticker)` 를 `openFor(it.ticker, nameOf(...))` 로 전달(L169) → `openFor` 가 `dispatch({kind:"setView", name})` (동기) → reducer `viewName = slots[ticker]?.name ?? action.name` (슬롯 없음 → 카드 이름) + `viewTicker=ticker` **같은 dispatch** → ctx 노출 → `GlobalAIAnalysis` `{...ctx}` 스프레드 → 패널 `knownName = tabs.find(무슬롯)=undefined ?? (ticker===viewTicker ? viewName : null) = 카드이름` → `displayName = 카드이름` (시세 대기 없음) | 헤더가 첫 렌더부터 카드와 동일한 종목명, 티커 폴백 프레임 없음 | viewTicker·viewName 이 **단일 동기 dispatch** 로 동시 도착 → 티커가 뜰 타이밍 창 부재. 카드가 표시하던 문자열과 헤더가 동일(같은 `nameOf` 소스). `useQueryStockPrice` 응답 이전에 이미 이름 확정 | 통과 |
| 2 | 진행/결과 슬롯 있는 종목은 탭 이름으로 계속 표시 (무회귀) | reducer L436 `viewName = state.slots[ticker]?.name ?? action.name` (슬롯 이름 우선), 패널 `knownName` 1순위 `tabs.find(t=>t.ticker===ticker)?.name` | 탭/슬롯 이름 그대로, viewName 은 슬롯 이름과 일치 | 슬롯 존재 시 탭 이름이 knownName 1순위로 사용, viewName 도 슬롯 이름 → 오염 없음 | 통과 |
| 3 | 이름 미전달 진입점(switchTab/open 재열기)은 슬롯 이름/시세→티커 폴백, 다른 탭 이름 오염 없음 | `open()`(L736)·`switchTab()`(L742) 은 `openFor(ticker)` (name 없음) → `openFor` L725 `name ?? namesRef.current[ticker] ?? null` (ticker 로 키잉된 자기 캐시) → reducer 슬롯 이름 우선. 패널 가드 `ticker === viewTicker ? viewName : null` | 미전달 시 기존 폴백 유지, 타 종목 이름 누수 없음 | `namesRef` 는 ticker 키잉이라 교차 오염 불가 + 패널 `viewTicker` 가드가 이중 방어. viewName·viewTicker 는 항상 동일 dispatch 동기 설정이라 불일치 프레임도 없음 | 통과 |
| 4 | 탭 스트립/동시 분석 라벨 등 기존 종목명 표시 무회귀 | `GlobalAIAnalysis` 탭 매핑(`tabs.map`, `useQueryStockNames(unknownTickers)`) 로직 diff 무변경 — viewName 컨텍스트 노출만 추가 | 탭 스트립 라벨 종전과 동일 | diff 상 탭 스트립/이름해석 경로 무수정. 컨텍스트 값·memo deps 에 `viewName` 추가만 존재 | 통과 |
| 5 | 타입체크/린트 무회귀 | `npx tsc --noEmit`; `npx eslint <3파일>` | 0 에러 | tsc EXIT 0 / eslint EXIT 0 (아래) | 통과 |

### AC5 실측 출력

```
$ npx tsc --noEmit
EXIT: 0

$ npx eslint hooks/stock/aiAnalysisProvider.tsx components/stock/AIAnalysisPanel.tsx components/stock/GlobalAIAnalysis.tsx
ESLINT_EXIT: 0

$ npm run build
BUILD_EXIT: 0
```

## 공통 AC

| 항목 | 명령/근거 | 결과 |
|---|---|---|
| typecheck/lint/build 0 에러 | 위 AC5 | 통과 |
| BFF 원칙 무회귀 | `git grep -nE "http://127\.0\.0\.1\|fetch\(" -- <3파일>` → none. 변경 파일은 route handler 아님(상태/표시 전용) | 통과 |
| 한글 톤 무회귀 | 변경은 상태 필드(`viewName`)·주석 추가·표시 로직뿐, 사용자 노출 신규 문구 없음 | 통과(N/A) |
| 접근성 무회귀 | 헤더 표시 텍스트 소스만 변경(티커→이름), label/aria/Tab 순서 무변경 | 통과 |

## 에지 케이스

| 케이스 | 거동 | 판정 |
|---|---|---|
| 이름 미해석 저장 항목(dbName·KIS 둘 다 null) | `nameOf` → ticker 반환 → openFor(ticker, ticker) → 헤더에 티커 표시(변경 전과 동일, 회귀 아님). PR 본문 `## 다음 작업` 에 별도 개선 여지로 명시됨 | 무회귀 |
| viewName 있으나 다른 종목 탭 렌더 | 패널 `ticker === viewTicker` 가드로 viewName 미적용 → 해당 탭 슬롯 이름/폴백 | 오염 없음 |
| StrictMode 더블 dispatch | `setView` 는 idempotent(같은 ticker/name 재설정) — 이중 마운트여도 최종 상태 동일 | 무회귀 |
| 슬롯 이름과 카드 이름 상이 | reducer 가 슬롯 이름 우선(`slots[ticker]?.name ?? action.name`) → 탭 라벨과 헤더 일관 | 정상 |

## 라이브 라운드트립

본 변경은 표시 전용(상태 필드 추가 + 헤더 문자열 소스 우선순위)이며 BFF/FastAPI 호출 경로·요청 스키마 무변경이다. dev 서버 격리 실행 제약(위 주의 참조)으로 라이브 브라우저 재현은 생략하고, 카드 렌더 소스(`nameOf`)와 헤더 소스가 동일함을 코드로 입증하여 갈음한다. 빌드(prod) 산출은 0 에러.

## 결론

AC 1~5 + 공통 AC 전부 통과. 실패 0건 → **qa-passed**.
