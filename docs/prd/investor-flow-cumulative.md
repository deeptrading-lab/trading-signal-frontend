# PRD — 홈 "외국인/기관 순매수" 7일 누적 (investor-flow-cumulative)

- slug: `investor-flow-cumulative`
- 상태: **작성(리뷰 대기)** · 2026-06-03
- 선행: `investor-flow`(표면 A 당일 Top10, 머지됨 #89/#90) 확장
- 관련 계획: `~/.claude/plans/holdings-foamy-popcorn.md` Track 2 (P1b)

---

## 1. 배경 / 목적

홈 "외국인/기관 순매수 Top10"(표면 A)는 KIS `FHPTJ04400000`로 **당일 가집계 스냅샷**만 보여준다. 사용자는 "요즘 외국인/기관이 꾸준히 담는 종목"(=최근 추세)을 보고 싶어 하는데, 당일 한 컷은 장중 변동·일시 수급에 흔들린다.

**핵심 제약**: `FHPTJ04400000`은 **날짜 파라미터가 없어** history 를 직접 못 받는다(웹 리서치 + 코드 확인). 따라서 7일 누적은 **매 영업일 당일 스냅샷을 KV 에 적립 → 합산**하는 방식이 유일하다.

목적: 홈 카드에 **당일 ↔ 최근 7영업일 누적** 전환을 제공해, 단발 수급이 아닌 **추세**로 외국인/기관 순매수 상위를 보여준다.

---

## 2. 목표 · 비목표

### 2.1 목표 (측정 가능)
- G1. 홈 Top10 카드에서 **당일 / 7일 누적** 전환(토글) 제공. 누적은 외국인·기관 각각 Top10.
- G2. 7일 누적 랭킹 = 최근 N영업일(최대 7) 스냅샷의 종목별 순매수 **거래대금 합산** 후 재정렬 상위 10.
- G3. 스냅샷이 7일 미만일 때(부트스트랩·공휴일) **실제 누적 일수를 라벨에 노출**("최근 N영업일 누적"). silent cap 금지.
- G4. cron 적립 실패/차단 시에도 홈 카드 **당일 모드는 무회귀**(기존 동작 유지), 누적 모드는 가용분/빈 상태로 graceful.

### 2.2 비목표 (명시적 제외)
- 종목 상세(표면 B) 7일 누적 — `inquire_investor`가 이미 ~30일 일자별을 주므로 별도(경량) 트랙. 본 PRD 범위 아님.
- 7일 외 임의 기간(3일/30일) 선택 — 추후.
- **정확한 전(全)시장 누적 랭킹** — `FHPTJ04400000`이 상위 N행만 주면 중위권 종목 누락 가능 → **근사 랭킹**으로 정의(§7, §9 q1).
- 개인(person) 누적 — 표면 A TR은 외국인/기관만 반환.
- 실시간 누적 — 적립은 일 1회(장마감 후).

---

## 3. 사용자 시나리오

1. 사용자가 홈에 진입 → "외국인/기관 순매수" 카드(기본 **당일**, 기존과 동일).
2. 카드의 **[당일 | 7일 누적]** 토글에서 "7일 누적" 선택.
3. 외국인·기관 각각 **최근 N영업일 누적 순매수 Top10** 표시. 헤더에 "최근 7영업일 누적"(부족 시 실제 일수).
4. 적립 데이터가 없으면(서비스 초기 등) "누적 데이터를 모으는 중" 안내 + 당일로 폴백 가능.

---

## 4. 기능 요구사항

### 4.A cron 스냅샷 적립
- **Vercel Cron** → `GET /api/cron/flow-snapshot` (평일 장마감 후 1회).
- `Authorization: Bearer ${CRON_SECRET}` 검증(미일치 401). Vercel Cron 은 헤더 자동 부착.
- 외국인·기관 각각 `fetchForeignInstitutionTotal('frgn'|'orgn')` 호출(기존 함수 재사용) — **전 행 저장**(top10 slice 안 함, 누적 커버리지 위해).
- KV 저장: `flow:snap:<YYYYMMDD>:<frgn|orgn>` = `[{ticker,name,netBuyAmount,netBuyQty}]`, TTL ~12일.
- 휴장/빈응답/실패 → **저장 skip**(fail-soft), 200 으로 종료(cron 재시도 폭주 방지).
- transient(EGW00201/네트워크) → 1회 재시도(기존 `isTransientError`/`safeFetch` 패턴 재사용 — `bffUtils` 공통화).

### 4.B 합산 조회
- `GET /api/flow/top10?mode=cumulative&days=7` (기존 `/api/flow/top10`에 `mode` 파라미터 추가; 기본 `mode=today`로 무회귀).
- 최근 `days` 영업일 스냅샷을 KV 에서 read → 주체별 ticker 합산(거래대금) → 재정렬 → 상위 10.
- 응답: 기존 `InvestorFlowTop10` + `cumulativeDays`(실제 합산 일수). 당일 모드는 `cumulativeDays` 생략/0.
- mock-first + prod 이중게이트(기존 동일). 누적 mock 도 제공.

### 4.C UI
- `InvestorFlowTop10Card` 에 당일↔누적 토글. 누적 라벨 "최근 N영업일 누적". 부족·빈 상태 안내.

---

## 5. 수용 기준 (AC)

- AC-1. cron 라우트가 CRON_SECRET 없이는 401, 있으면 스냅샷을 KV 에 저장(키 스키마 일치).
- AC-2. `mode=cumulative&days=7` 가 최근 ≤7영업일 합산 Top10 + `cumulativeDays` 반환.
- AC-3. 스냅샷 < 7일이면 가용분만 합산하고 `cumulativeDays`=실제값, UI 라벨에 그 값 노출.
- AC-4. cron/KV 미가용·키 없음 → 누적 mock(또는 빈+안내), 당일 모드 무회귀.
- AC-5. `mode` 미지정/`today` → 기존 당일 Top10 동작·응답 byte 동등(무회귀).
- AC-6. 휴장일 cron 호출 → 빈 응답 감지 후 저장 skip, 200.
- AC-7. transient(EGW00201) 1회 재시도 동작(로그/관측 확인).

---

## 6. 데이터 / API 명세 (확정)

### 6.1 cron schedule (`vercel.json`)
```json
{ "crons": [ { "path": "/api/cron/flow-snapshot", "schedule": "10 7 * * 1-5" } ] }
```
- `10 7 * * 1-5` = UTC 07:10 = **KST 16:10**(장마감 15:30 + 가집계 확정 여유). 평일만(월~금).
- 공휴일은 cron 이 그래도 발화 → 라우트가 빈응답 감지로 저장 skip(§4.A).

### 6.2 KV 키 스키마 (`lib/api/kis/store.ts` KisStore 재사용)
- key: `flow:snap:<YYYYMMDD(KST)>:<frgn|orgn>`
- value(JSON): `InvestorFlowRow[]` 전 행(name·netBuyAmount·netBuyQty 핵심).
- TTL: 12일(7영업일 + 주말/공휴일 여유).

### 6.3 합산 알고리즘
- 최근 `days`개 **존재하는** 스냅샷 키를 KST 영업일 역산으로 조회(없는 날 skip, 최대 12일 거슬러 ≤7개 수집).
- ticker 별 `netBuyAmount` 합산(name 은 최신 스냅샷 우선) → 내림차순 정렬 → 상위 10.
- `netBuyQty` 도 병기 합산(표시용). `changePercent`·`price`·`direction` 은 누적서 무의미 → 누적 모드에선 생략/0(UI 가 분기).

### 6.4 env
- `CRON_SECRET` (Vercel Environment Variables). KV 는 기존 `KIS_TOKEN_STORE=kv` 라이브.

---

## 7. 비기능 요구사항

- **정확도(중요)**: 7일 누적은 일별 랭킹 스냅샷 합산이라, `FHPTJ04400000`이 상위 N행만 반환하면 매일 중위권이던 종목이 누락돼 **근사**다. cron 이 반환 행 수를 `console.info`로 로깅(§9 q1 PoC). 근사임을 카피로 오인 방지("누적 순매수 상위").
- **fail-soft**: KV/외부 실패는 throw 금지 — 당일 모드 무회귀, 누적은 가용분/빈.
- **부트스트랩**: 적립 시작 후 7영업일 지나야 완전 7일. 그 전 "최근 N영업일".
- **rate-limit**: cron 2콜 순차 + transient 재시도(기존 패턴).
- **보안**: cron 라우트 CRON_SECRET 필수, KV 키에 민감정보 없음.

---

## 8. 영향 분석

### 8.1 신규 파일
- `app/api/cron/flow-snapshot/route.ts` — cron 적립 라우트.
- `lib/server/flowSnapshotStore.ts` — KV 적립/조회 얇은 래퍼(`KisStore` 재사용) + 영업일 키 역산.
- `lib/mock/flow/cumulative.ts` — 누적 mock.
- `docs/design/investor-flow-cumulative.md` — 토글 UX(UX 단계).
- `docs/qa/investor-flow-cumulative.md` — QA(QA 단계).

### 8.2 수정 파일
- `app/api/flow/top10/route.ts` — `mode=today|cumulative` 분기(+ `isTransientError`/`safeFetch` 를 `bffUtils` 공통화하며 cron 과 공유 → [[project_deferred-followups]] #90 후속 동시 해소).
- `lib/server/bffUtils.ts` — `isTransientError`/`safeFetch` 공통화.
- `lib/types/flow/top10.ts` — `cumulativeDays?` 추가.
- `hooks/flow/useQueryFlowTop10.ts` — `mode`/`days` 파라미터화 + queryKey 분기.
- `hooks/query/queryKeys.ts` · `lib/query/queryConfig.ts` — 누적 키/TTL(누적은 staleTime 길게, 하루 1회 갱신).
- `lib/copy/flow/labels.ts` — "최근 N영업일 누적" · 부트스트랩 안내.
- `components/flow/InvestorFlowTop10Card.tsx` — 당일↔누적 토글 + 누적 상태.
- `vercel.json` — `crons` 추가.

### 8.3 변경 라인 추정 · 회귀 위험
- ~400~550줄(신규 라우트/스토어/UI 토글 비중). 단일 PR.
- 회귀 위험: 당일 모드 무회귀가 1순위(AC-5). `bffUtils` 공통화 시 기존 top10 재시도 동작 동등 확인.

---

## 9. OPEN QUESTION (사용자 결정 대기 — PM 권고 동봉)

- **q1. `FHPTJ04400000` 반환 행 수 = 누적 정확도** — ✅ **[RESOLVED · 로컬 PoC 2026-06-03]**: prod 키 호출 시 **주체당 30행** 반환(전시장 아님, 순매수 상위 30). 7일 누적은 **상위권 근사 랭킹**으로 확정 — 매일 30위권 밖 종목은 누락 가능하나 홈 카드 목적(추세 상위)엔 충분. 카피 "Top10"(상위 전제) 유지. cron 이 행 수 상시 `console.info` 로깅.
- **q2. 라우트 형태** — ✅ **[DECIDED]** 기존 `top10`에 `mode` 파라미터(중복 최소, 게이트/타임아웃 공유).
- **q3. UI** — ✅ **[DECIDED · 사용자]** 당일↔누적 **토글**(한 카드).
- **q4. cron 시각** — KST 16:10(07:10 UTC) 채택. 운영 보며 조정(빈응답이면 더 늦게). ⚠️ Vercel Hobby 플랜은 cron 1일 1회 제한 — 본 스케줄은 평일 1회라 호환(요금제 확인).
- **q5. 부트스트랩 노출** — 7일 안 모인 초기 "최근 N영업일" 라벨로 충분 vs 별도 안내. → **PM 권고: 라벨로 충분**, 0일이면 "데이터 수집 중 — 당일로 표시".
- **q6. 적립 시작 시점** — 머지 즉시 cron 시작(7영업일 후 완전체) vs 백필 시도. → **PM 권고: 즉시 시작, 백필 없음**(과거 일자 스냅샷 취득 불가하므로).

---

## 참고
- 선행 PRD: `docs/prd/investor-flow.md` (§6.1 표면 A TR 명세).
- 코드: `lib/api/kis/investor-flow.ts::fetchForeignInstitutionTotal`, `app/api/flow/top10/route.ts`, `lib/api/kis/store.ts`.
- 메모리: [[reference_kis-api-conventions]], [[project_vercel-deferred]], [[project_deferred-followups]].
