# QA — intraday-session-status (단타 세션 상태 시인성)

- 대상 PR: #364 `feature/intraday-session-status`
- 일자: 2026-07-14
- 범위: /intraday 워치 표 세션 상태 필·좌측 스트라이프·일시정지 디밍·"판단 끊김" 개칭

## AC 검증

| # | AC | 재현 | 기대 | 실측 | 판정 |
|---|----|------|------|------|------|
| 1 | 실행 중 세션이 한눈에 구분 | running 세션 행 렌더 | 녹색 필(market-open-soft 배경)+맥박 점 + 좌측 녹색 스트라이프 | StatusPill running 분기 + `stripeColor`=bg-market-open. 빌드 CSS에 `.bg-market-open-soft`/`.text-market-open`/`.bg-market-open` 방출 확인 | PASS |
| 2 | 일시정지는 "의도된 정지"로 조용히 | paused 세션 행 | 회색 필+정지 아이콘, 행 숫자(종목명·현재가·등락률·수익률·평가금액) muted 디밍, 스트라이프 희미한 회색 | `dimmed = status==="paused"` 게이트가 5개 셀 톤 오버라이드. changeTone 은 `!dimmed` 조건으로 차단 | PASS |
| 3 | 판단 끊김(stalled)은 이상 상태로 구분 | running + `isPaperSessionStalled`=true | 앰버 필 "판단 끊김"(hover 힌트) + 앰버 스트라이프. running 필보다 우선 | StatusPill/stripeColor 모두 stalled 분기가 첫 순서. stale 판정 유닛 테스트 5/5 통과 | PASS |
| 4 | 완료·실패 상태 표기 | completed / failed 세션 | 완료=테두리형 조용한 필(디밍 없음·성과색 유지), 실패=critical 필. 스트라이프 없음 | 각 분기 확인. `.bg-critical-soft` 방출 확인. completed 는 dimmed 대상 아님 | PASS |
| 5 | 펼침 패널 소속 표시 | 세션 행 펼침 | 펼침 행에도 같은 색 스트라이프 연장 | 펼침 `td`(colSpan=13, relative)에 동일 `StatusStripe` 렌더 | PASS |
| 6 | 그룹 요약 색 문법 통일 | 날짜 그룹 "실행 N" | accent-vivid(파랑) → market-open(녹색) | IntradayWatchTable 라인 교체 확인 | PASS |
| 7 | 카피 개칭 | stalled 배지 | "멈춤" → "판단 끊김", 힌트 "자동 판단이 끊겼어요" | `INTRADAY_PAPER_COPY.stalled/stalledHint` 반영. UI 노출 카피 내 "멈춤" 잔존 0건(grep) | PASS |

## 회귀·정합 게이트

| 게이트 | 결과 |
|---|---|
| `tsc --noEmit` | PASS (0 에러) |
| `eslint` (변경 3파일) | PASS |
| `vitest` components/intraday (17) + paperTradingStale (5) | 22/22 PASS |
| `npm run build` (Turbopack prod) | exit 0 |
| 빌드 CSS 클래스 실측 (속성선택자+@apply 함정 대비) | `.bg-market-open(-soft)`·`.text-market-open`·`.w-xs`·`.rounded-r-pill`·`.inset-y-xs`·`.bg-critical-soft` 전부 방출 |

## 에지 케이스

- **stalled 우선순위**: status="running" && stalled → "판단 끊김"만 표시(실행 중 필 미표시). 의도대로.
- **무세션 워치 행**: 필·스트라이프·디밍 전부 미적용 (current=null 가드).
- **memo 행 무결성**: 신규 props 없음 — stripe/dimmed 는 행 내부 파생값이라 #359 memo 최적화 유지.
- **접근성**: 색+모양(점/정지 아이콘)+텍스트 삼중 부호(색약 안전). 맥박은 `motion-safe:` 게이트(reduced-motion 존중). 스트라이프·점은 `aria-hidden`.
- **다크모드**: 사용 토큰 전부 `html.dark` 변수 보유(market-open 다크 #4ade80 등) — 자동 대응.
- **레거시 failed 세션**: STATUS_LABEL.failed 필 분기 존재(critical).

## 한계(관찰 항목)

- 브라우저 육안(라이트/다크 실세션 혼재 화면)은 코드·빌드 실측으로 대체 — 장중 실세션 혼재 상태의 실기기 확인은 머지 후 운영 관찰로 커버(기존 관례: 사용자 육안 오버사이트).
