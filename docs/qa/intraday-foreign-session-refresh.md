# QA — intraday-foreign-session-refresh (PR #339)

공유 Supabase 를 여러 로컬 dev 서버가 함께 쓸 때, 타 운영자(`owner !== operator`) 소유 단타 세션이 부팅 hydrate 스냅샷에 고정돼 `/intraday` "최근 판단"이 멈춰 보이던 버그 수정. 목록/상세 조회 시 TTL(20초) + single-flight 게이트로 남의 세션만 DB 최신본 재조회(`refreshForeignSessions`). 브랜치 `feature/intraday-foreign-session-refresh`, 단일 파일 `lib/server/paperTrading/sessionStore.ts` (+58).

## 검증 방식

인메모리(`globalThis.__paperTradingStore`)가 SSOT, Supabase 는 write-through 백업 — HTTP 엔드포인트(`/api/paper-trading/sessions`)는 로그인 쿠키 미들웨어 게이트로 curl 직접 호출이 unauthorized 이므로, **`tsx` 로 실 코드(`loadPersistedPaperTrading` + `listPaperTradingSessions`/`getPaperTradingSessionDetail`)를 직접 import** 해 실 Supabase(`INTRADAY_OPERATOR=하영`) 대상으로 SSOT 계층에서 라운드트립을 재현했다. `global.fetch` 를 계측해 DB 왕복 횟수를 실측했다.

## 자동 검증 (실측)

- `npx tsc --noEmit` → **exit 0** (전체 레포 clean).
- `npx eslint lib/server/paperTrading/sessionStore.ts` → **exit 0** (clean).
- `next build` → **의도적 생략**. QA 시점 사용자 dev 서버가 `:3000` 에서 실행 중(`lsof` 확인)이라 `next build` 가 라이브 `.next` 를 덮어 dev 서버를 깨뜨릴 위험. 변경은 순수 서버 TS 유틸 1개이며 전체 레포 `tsc --noEmit` 이 컴파일 무결성을 이미 커버.

## AC 별 재현·기대·실측

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| **1** owner!==operator 세션 DB 최신본 갱신 | tsx 로 실 `loadPersistedPaperTrading()` 호출 + `refreshForeignSessions` 필터(`owner && owner!==operator`) 파티션 | 찬민 세션만 재조회 대상, DB 최신 틱 반영 | operator=하영, 총 50세션 중 **foreign 14건(owner=찬민)** 재조회 대상. 샘플 세션 `b06757e1…`: **41틱, lastTickWindowStart=06:20Z(=15:20 KST), status=paused** — PR 본문 "15:20 마감" 정합 | ✅ |
| **2** 상세: 남의/미지 세션 갱신 후 반환 | `getPaperTradingSessionDetail(id)` — foreign / own / 미지 id | foreign·own 정상 반환, 미지 id → null | foreign 상세 = OK(41틱), 내 세션 상세 = OK(70틱), `nonexistent-id-xyz` = **null** | ✅ |
| **3** 내/레거시(`!owner \|\| owner===operator`) 제외 | 같은 파티션에서 제외군 집계 + 누수 검사 | 내/레거시는 재조회 제외, foreign 에 혼입 0 | 제외 **36건** (하영 12 + 레거시(미소유) 24). 필터 누수 **0건** | ✅ |
| **4** TTL(20초)+single-flight | ① 연속 호출 fetch 계측 ② 동시 10회 발사 | TTL 내 추가 호출 0 DB왕복, 동시 다발도 1왕복 | 1차 호출=**2왕복**(hydrate+foreign refresh), TTL 내 연속 3회 추가=**0왕복**(경과 1278ms<20000ms). 동시 10회 → **sessions REST 2회**(10배 아님) = single-flight 입증 | ✅ |
| **5** load 실패 시 TTL 미갱신·메모리 보존·재시도 | `fetch` 를 500 위장 + `foreignRefreshedAt` 만료 강제 → 재호출 | 재조회 시도(실패), foreignRefreshedAt 미갱신, 메모리 불변, 다음 호출 재시도 | 실패 refresh 1왕복 시도 → **foreignRefreshedAt 미갱신(정상)**, 메모리 세션 수 **before 50 = after 50**, 실패 직후 재호출 **재시도 1왕복**(TTL 미갱신 입증) | ✅ |
| **6** 타입/린트 무회귀 | `tsc --noEmit`, `eslint` | 0 에러 | 둘 다 exit 0 | ✅ |

## 라운드트립 (BE = 실 Supabase, SSOT 계층 재현)

버그의 본질은 프론트/BE 왕복이 아니라 **인메모리 스냅샷 고착**이므로, 라운드트립을 인메모리 SSOT 계층(실 `listPaperTradingSessions`/`getPaperTradingSessionDetail`)에서 실 DB 상대로 재현했다.

1. **부팅 hydrate → 목록 조회**: `listPaperTradingSessions()` 최초 호출 시 hydrate(1) + foreign refresh(1) = sessions REST 2왕복, 50세션 반환.
2. **찬민 세션 신선도**: foreign 샘플이 부팅 스냅샷(과거)이 아니라 DB 최신본(41틱, 15:20 KST paused)으로 갱신됨 — 버그 재현 조건(멈춘 "최근 판단")이 해소됨을 실측.
3. **반복 새로고침 시뮬레이션**: TTL(20초) 내 목록/상세 반복 호출 시 DB 재접근 0 — 잦은 폴링에도 DB 부하 상한 유지.
4. **내 세션 격리**: 내 세션(하영, 70틱) 상세는 메모리 우선으로 그대로 반환(재조회 대상 아님) — 소유자 게이트와 대칭.
5. **미지 세션**: 존재하지 않는 id 상세 조회 → null (크래시 없음).

> 반응형/두 뷰포트 검증은 해당 없음(순수 서버 유틸, UI 변경 0).

## 에지 케이스

- **BE(Supabase) 다운/오류(500)**: `loadPersistedPaperTrading` status=error → `foreignRefreshedAt` 미갱신, 기존 메모리 값 유지, 다음 접근 재시도. 실측 확인(AC-5). 사용자 화면은 마지막 알려진 값 유지(회귀 없음).
- **disabled(Supabase 미설정)**: status="ok" 아님 → early return, 게이트 미갱신. 무DB 로컬 환경 기존 동작 동일.
- **동시 다발 폴링/새로고침(레이스)**: `store.foreignRefresh` single-flight promise 재사용 → 동시 10회도 DB 1왕복. TTL 체크는 in-flight 체크 뒤에 위치(순서 정합).
- **부팅 후 새로 등장한 미지 세션 상세**: 메모리에 없으면(`!existing`) refresh 트리거 후 재조회 — 남의 세션이 부팅 이후 생성돼도 상세 접근 시 반영. 단, 재조회로 로드된 세션이 **내 operator 소유**면 refresh 필터가 스킵하므로 여전히 부재 → null 반환(같은 operator 다중 서버는 PR 범위 밖, 본문 명시).
- **tickChain 보존**: foreign 세션 덮어쓸 때 `existing?.tickChain` 방어적 보존(남의 세션엔 통상 없음) — 내 세션 틱 직렬화 체인과 무관.
- **timestamp 기준**: `foreignRefreshedAt = now`(함수 진입 시각)로 세팅 — load 소요시간만큼 TTL 이 미세하게 짧아지나 무해(20초 게이트 목적 충족).

## 무회귀

- **BFF**: `git grep 127.0.0.1 -- app/` 신규 위반 0(기존 workbench route-handler fallback만). 변경 파일 내 직접 `fetch(` 0건(전량 `loadPersistedPaperTrading` 경유).
- **한글 톤**: 변경분 58줄은 전부 주석/로직 — 신규 사용자 노출 문자열 0건.
- **접근성**: UI 변경 없음(해당 없음).
- **소유자 게이트 대칭성**: 재조회 필터(`!owner || owner===operator` 제외)가 tickScheduler 소유자 게이트(#326)와 정확히 대칭 — 내가 틱하는 세션은 메모리 우선, 안 틱하는 남의 세션만 DB 재조회. 이중 갱신/충돌 없음.

## 판정

**qa-passed** — AC 1~6 전부 통과, 실패 0건. 실 Supabase 대상 tsx 통합검증으로 필터 파티션(14 foreign / 36 own·legacy, 누수 0)·TTL·single-flight·실패 재시도를 실측 확인. `## 다음 작업` 섹션 PR 본문 존재 확인.
