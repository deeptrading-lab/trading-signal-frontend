# QA — swing-ui (PR-3: 스윙 체크 화면)

- 실행: 2026-11-02 00:20~00:40 KST
- 대상: 브랜치 `feature/swing-ui`
- 근거: `docs/prd/swing-judgment.md` §5 PR-3 AC-3.1~3.7, 디자인 `docs/design/swing-ui.md`
- 데이터: prod Supabase `swing_judgments`(2026-10-30 거래일, 첫 prod 실행분) + 로컬 dev 서버(로그인 게이트만 로컬에서 끔, 운영 설정 무변경)

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-3.1 테스트·타입·린트 | `npx vitest run` · `npx tsc --noEmit` · `npm run lint` | 통과 | 테스트 **1,683 통과**(3 skip, 기존) · 타입 오류 0 · 린트 에러 0(경고 3건은 안 건드린 기존 스크립트) | 통과 |
| AC-3.2 DESIGN.md | `npx @google/design.md lint docs/design/swing-ui.md` | errors 0 | errors 0 · warnings 0 · 신규 색·타이포·spacing 0(기존 토큰만) | 통과 |
| AC-3.3 금지어 | `lib/copy/swing/__tests__/labels.test.ts` "체크리스트 모드 금지어" | 카피 상수에 매수 후보·추천·확실·지금 사·손절가·목표가 없음 | 통과(문자열 20개 이상 검사) | 통과 |
| AC-3.4 `/swing` 두 뷰포트 | 390×844·1440×900 캡처 | 탭·시장 필터·빈 목록·URL 유지 | 수급 조건 충족 3종목(메리츠금융지주 4/7·한국가스공사 5/7·한화투자증권 3/7, 셋 다 연기금 순매수) · 주의 종목 KOSDAQ 50행(고변동·과열 칩) · KOSDAQ 수급 탭 빈 목록 안내 + 주의 탭 안내 · `?tab=excluded&market=KOSDAQ` 로 직접 진입 시 같은 탭 | 통과 |
| AC-3.5 종목 카드 | `/stock/036460`(390) · `/stock/005930`(1440) · `/stock/AAPL`(390) | 국내 카드, 미국 없음 | 036460: 충족 5/7, 주의 없음, 참고 지지 36,600·저항 40,250(호가 단위)·변동폭 ±3.2%, 과거 통계 "수급·국면 충족 3,426건". 005930: 주의 사유 "고변동 — ATR 7.0% (KOSPI 기준 4.97% 이상)" + 그 상태의 과거 통계(16,674건, 같은 날 전체 대비 −0.48%p). AAPL: 스윙 카드 0개, 기존 요약 유지 | 통과 |
| AC-3.6 숫자 표기 | 카피 테스트 + 캡처 | 억 원·부호·천 단위, 호가 단위 레벨 | 005930 개인 −9,070억 원·기관 +10,607억 원 · 참고 저항 257,834 → **258,000**(호가 단위로 수정 후) | 통과 |
| AC-3.7 BFF 경유 | `grep "fetch(" components/swing hooks/swing lib/api/swing lib/copy/swing` | 0 | 0(`refetch()` 만) — axios `httpClient` → `/api/swing/*` | 통과 |

## 상태·에지 케이스

| 경우 | 결과 |
|---|---|
| ETF(`/stock/069500`) | 카드에 "스윙 체크는 KOSPI·KOSDAQ 상장 주식만 지원해요(ETF·ETN·해외 종목 제외)." · 다시 시도 버튼 없음(404). 이전 문구 "국내 종목만 지원"이 국내 ETF 에 틀린 안내라 이번에 바꿈 |
| 없는 종목(`999999`) | 같은 404 문구 |
| 집계 전(tradeDate null) | 코드 경로 확인 — 첫 prod 실행 뒤라 실화면 재현 불가. 안내 "아직 집계 전이에요…" |
| 마지막 집계 실패(run.ok=false) | 상단에 경고색 한 줄(코드 경로 확인, 현재 run.ok=true) |
| 탭 전환 중 | 이전 목록을 흐리게 유지(`keepPreviousData`) — 빈 화면 깜빡임 없음 |

## 캡처 중 고친 것

1. 1만 억 이상 금액에 천 단위 구분이 없었다(−9070억) → `toLocaleString`.
2. 참고 저항이 매물대 계산값 그대로(257,834) → 호가 단위 반올림.
3. 주의 사유 줄에 줄표가 두 번(고변동 — … — KOSPI 기준) → 괄호로.
4. 빈 목록 문구의 "오늘은" 삭제(목록은 오늘이 아니라 기준일 데이터).

## 미룬 것

- 판정 레벨 차트 오버레이 — 체크리스트 모드에선 레벨이 "참고"라 카드 숫자로 충분.
- `SegmentedTabs` 가 `components/analyze/` 에 있다 — PR-5(/analyze 삭제) 때 `components/ui/` 로 옮긴다.
