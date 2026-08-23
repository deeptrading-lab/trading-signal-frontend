# QA — profile-real-data (마이페이지 mock 제거 · 실데이터 교체)

- **PR**: #387 / `feature/hylee/profile-real-data`
- **일자**: 2026-08-23
- **환경**: 로컬 `next dev` (Node), Supabase 운영 DB(읽기), OAuth env 설정됨(게이트 활성)
- **PRD**: 없음 — 경량 반복 워크플로(버그·정리성 작업). 수용 기준은 변경 내용에서 도출.
- **판정**: **PASS** (결함 1건 발견 → 같은 브랜치에서 수정 후 재검증 완료)

## 검증 방법

세션 쿠키를 `signIdentitySession` 으로 직접 서명해 페르소나 4종을 만들고 `/profile` 을
실제 서버에서 렌더시켜 응답 본문을 검사했다. 프로필 데이터는 운영 Supabase `profiles`
테이블의 **실제 행**을 사용했다(생성·수정 없음, 읽기만).

## AC 별 결과

| # | 수용 기준 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| 1 | mock 프로필이 사라진다 | 페르소나 3종으로 `/profile` 로드 | 김투자·investor.kim·PRO 멤버십·공격투자형 0건 | 전 페르소나 **0건** | PASS |
| 2 | 자산·거래소 섹션이 사라진다 | 동일 | 총 자산·키움증권·업비트·pravatar 0건 | 전 페르소나 **0건** | PASS |
| 3 | 동작 안 하던 설정 행이 사라진다 | 동일 | 알림 설정·보안 및 인증·구독/결제·프로필 수정 0건 | 전 페르소나 **0건** | PASS |
| 4 | 프로필이 DB 실데이터로 뜬다 | superadmin(`108701889802605315165`) | 이하영 / lhy.it.0118@gmail.com / 최고 관리자 / 2026.07.05 가입 | 4항목 전부 일치 | PASS |
| 5 | 등급 배지가 role 을 따른다 | user(`118092932126865025463`) | "일반" | "일반" | PASS |
| 6 | 관리자 메뉴는 admin 이상만 | user 페르소나 | 관리자 메뉴·신호 성적표·유저 관리 미노출 | 3항목 **전부 미노출** | PASS |
| 7 | 관리자 메뉴가 admin 이상엔 뜬다 | superadmin 페르소나 | 3항목 노출 | 3항목 노출 | PASS |
| 8 | 내 분석이 계정별로 분리된다 | 페르소나별 `/api/stock/ai-analysis/decisions` | 각자 소유 건만 | super **20건**(458870·005930·263750…) / user **0건** / ghost **0건** | PASS |
| 9 | 내 종목 안내 문구 노출 | 전 페르소나 | "이 기기에만 저장돼요" | 전 페르소나 노출 | PASS |
| 10 | 이탈 링크가 전부 살아있다 | superadmin 으로 각 경로 GET | 200 | `/analyze` `/watchlist` `/dashboard/scorecard` `/admin` `/stock/005930` **전부 200** | PASS |

## 에지 케이스

| 케이스 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| DB 에 없는 sub (스토어 조회 실패 대용) | `sub=no-such-sub-999`, role=admin 쿠키 | 500 아니라 세션 값 축약 프로필로 렌더(fail-soft) | **200**, "이름 미상" + 세션 role 기준 관리자 메뉴 노출 | PASS |
| 세션 없음 | 쿠키 미첨부 | 게이트가 `/login` 유도 | **307** → `/login` | PASS |
| 게스트 분기(OAuth 미설정 환경) | 코드 경로 | 가입일 미표기 | ⚠️ **최초 구현은 "1970.01.01 가입" 노출** → 수정 후 미표기 | FIXED |
| 승인 대기 배지 | pending 프로필 조회 | 배지 노출 | **미검증 — 모집단 0** (현재 pending 프로필 없음). 아래 참고 | 보류 |

### 승인 대기 배지 도달성 (정적 분석)

pending 유저는 OAuth 콜백에서 **쿠키를 못 받고** `/pending` 으로 307 되므로(`callback/route.ts:80`)
정상 로그인 경로로는 `/profile` 에 도달할 수 없다. 다만 `readBody` 가 `status:"pending"` 을
받아들여(`approvals/route.ts:84`) 관리자가 **승인된 유저를 pending 으로 되돌릴 수 있고**,
세션 쿠키에는 status 가 실리지 않아 기존 쿠키가 그대로 유효하다. 이 경로로 배지가 실제
렌더된다 — 죽은 분기가 아니다. 실계정 상태를 변경하지 않기 위해 실측은 하지 않았다.

## 라운드트립

| 흐름 | 기대 | 실측 |
|---|---|---|
| 마이페이지 → "전체 보기" → `/analyze` | 분석 목록 재요청 없이 즉시 표시 | `MyAnalysisSummary` 와 `/analyze` 가 **동일 훅(`useQueryAIDecisions`)** → queryKey 동일, 캐시 공유(구조적 보장) |
| 마이페이지 → 종목 칩 → `/stock/[ticker]` | 종목 상세 진입 | `/stock/005930` 200 |
| 마이페이지 → 관리자 메뉴 → `/admin` | 유저 관리 진입 | 200 |

## 반응형

`grid-cols-1 gap-2xl md:grid-cols-2`(본문 2열) · `md:flex-row`(아이덴티티 헤더) 클래스가
응답 본문에 존재. 모바일 1열 / 데스크탑 2열 stacking 구조 유지 확인.

## 회귀

- `npx tsc --noEmit` 통과
- `npx eslint app components hooks lib` 에러·경고 **0**
- `npx vitest run` **1491 passed / 3 skipped** (삭제한 `lib/api/profile` 테스트 2건만큼 감소)

## 관찰 (결함 아님)

`MyStocksSummary` 가 `useWatchlistTickers` 를 마운트하면서 "최초 진입 시 대표주 3종 자동 시드"
부수효과를 함께 들여온다. 다만 이 훅은 이미 홈(`StockSearchContainer`·`RealtimeRankingSection`·
`DisclosureFeedContainer`)과 종목 상세(`StockHeader`)에서 마운트되므로, 마이페이지 도달 시점엔
이미 시드가 끝나 있다 — **실질 무영향**으로 판단.
