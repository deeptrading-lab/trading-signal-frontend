# QA — intraday-order-log-rationale (체결 내역 판단 메모 + 기본 탭 + 그리드 정렬)

- 대상 PR: #365 `feature/intraday-order-log-rationale`
- 일자: 2026-07-14
- 범위: /intraday 워치 행 펼침 — 체결 미니 로그 판단 메모·탭 기본값/순서·컬럼 정렬

## AC 검증

| # | AC | 재현 | 기대 | 실측 | 판정 |
|---|----|------|------|------|------|
| 1 | 체결별 판단 메모 표시 | 세션 행 펼침 → 체결 내역 | 각 체결 우측에 해당 틱의 판단 메모 | `allOrders` flatMap 에서 `rationale: tick.rationale` 부착 → 미니 로그 5번째 트랙 렌더. 사용자 브라우저 육안 확인 완료("좋아 잘 나오네") | PASS |
| 2 | 메모 최대 2줄 말줄임 | 긴 메모 체결 | 2줄 초과분 말줄임 + hover 전문 | `line-clamp-2` + `title={order.rationale}`. 빌드 CSS `.line-clamp-2` 방출 확인 | PASS |
| 3 | 기본 탭 = 체결 내역 | 행 펼침 | 체결 내역이 먼저 열리고 탭 순서 '체결 내역 \| 차트' | `useState("orders")` + 탭 배열 `["orders","chart"]`. 차트 스켈레톤/recharts 는 차트 탭 첫 클릭 시에만 로드 | PASS |
| 4 | 컬럼 정렬(보이지 않는 그리드) | 팩트 폭이 다른 여러 체결 행 | 시각·구분·수량×가격·손익·메모 5컬럼 시작점 전행 일치 | ul `grid-cols-[auto_auto_auto_auto_1fr]` + li `grid-cols-subgrid`(빌드 CSS 방출 확인). 사용자 육안 정렬 확인 | PASS |
| 5 | 손익 없는 매수 행 정렬 유지 | 매수 체결(realizedPnl null) | 메모 컬럼이 앞으로 안 밀림 | 손익 span 을 null 이어도 항상 렌더(빈 셀이 트랙 점유) | PASS |
| 6 | 모바일 레이아웃 | sm 미만 뷰포트 | 메모가 팩트 아래 전폭 랩 | 메모 셀 `col-span-full sm:col-span-1 sm:col-start-5` — subgrid li 내부 암시 행으로 낙하 | PASS |

## 회귀·정합 게이트

| 게이트 | 결과 |
|---|---|
| `tsc --noEmit` | PASS |
| `eslint` (IntradayWatchRow.tsx) | PASS |
| `vitest` components/intraday (17) | 17/17 PASS |
| `npm run build` (Turbopack prod) | exit 0 |
| 빌드 CSS 실측 | `.grid-cols-subgrid`·`.line-clamp-2`·`.col-span-full`·`.gap-x-md` 방출 |
| 사용자 육안(로컬 dev) | 판단 메모·정렬 정상 확인 |

## 에지 케이스

- **같은 틱의 매수+매도**: 판단이 틱 단위라 두 체결에 동일 메모 — 의도된 동작.
- **메모 없는 체결**(rationale 빈 문자열): 메모 셀 미렌더 — 그리드 트랙은 유지(1fr 빈 공간).
- **차트 탭 마커**: allOrders 에 rationale 필드가 추가됐지만 마커 매핑은 at/price/side 만 사용 — 무영향.
- **subgrid 브라우저 호환**: Chrome 117+·Safari 16+·Firefox 71+ (2023~) — 지원 범위 문제없음.
- **memo 행 무결성**: 신규 props 없음 — 행 내부 파생값만 변경, #359 memo 최적화 유지.

## 한계(관찰 항목)

- hover title 은 터치 기기에서 전문 확인 불가 — 클릭 확장은 후속 검토(PR 다음 작업).
