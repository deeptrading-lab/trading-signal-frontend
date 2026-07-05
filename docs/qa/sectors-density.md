# QA — sectors-density (PR #275)

홈 "지금 뜨는 산업"(`TrendingSectorsSection`) 행 밀도를 형제 실시간 순위표와 통일하는 경량 UX 폴리시. PRD 없음. 브랜치 `feature/sectors-density`, 커밋 `fe05136`.

- 검증 위치: 격리 worktree `/Applications/하영/code_source/tsf-wt-sectors-density`
- 변경 파일: `components/home/TrendingSectorsSection.tsx`, `docs/design/finsight-redesign.md`(sector-row-h 1줄 제거), `tailwind.theme.json`(sector-row-h 1줄 제거)
- 빌드 주의: worktree node_modules 는 메인트리 심볼릭 → Turbopack 거부. `rm node_modules && npm ci`(real 설치) 후 build 실측, 검증 종료 시 심볼릭 복원.

## 판정 요약: qa-passed (실패 0건)

| AC | 항목 | 결과 |
|---|---|---|
| AC1 | 밀도 통일(ListRow py-md·헤어라인·56px 해소) | PASS |
| AC2 | 폰트(text-body-sm-strong / text-caption / plain 넘버) | PASS |
| AC3 | 기능 무회귀(모달·키보드·hover/focus·가용성·breadth) | PASS |
| AC4 | 토큰 제거·design:sync 멱등·코드 참조 0 | PASS (docs 잔여 nit) |
| AC5 | tsc·eslint·build 게이트·신규 클래스 0 | PASS |

---

## AC별 재현·실측

### AC1 밀도 통일

| 재현 | 기대 | 실측 |
|---|---|---|
| `SectorRow` 렌더 구조 확인 | 순위표와 동일 `ListRow`(py-md 자동 높이 + `border-b border-border-line last:border-b-0`), 56px 고정 높이 제거 | `<button h-sector-row-h>` → `<ListRow>` 로 교체. `ListRow` = `flex items-center gap-md py-md` + 헤어라인. `RealtimeRankingSection` 의 `RankRow` 도 동일 `ListRow` 사용 → 두 섹션 동일 밀도. PASS |
| 스켈레톤 정합 | 순위표 정합 플랫 헤어라인 | `flex items-center gap-md border-b border-border-line py-md last:border-b-0` — `RealtimeRankingSection` 스켈레톤(657줄대)과 동일 리터럴. PASS |
| 홈 렌더 스모크(dev) | 섹션 정상 렌더 | `GET / 200`, 렌더 HTML 에 "지금 뜨는 산업" 1건 present, 컴파일/런타임 에러 0. PASS |

### AC2 폰트

| 요소 | 기대 | 실측(TrendingSectorsSection.tsx) | 순위표 대조 |
|---|---|---|---|
| 업종명 | text-body-sm-strong(14px) | `min-w-0 flex-1 truncate text-body-sm-strong text-text-strong` | 동일(605줄 `text-body-sm-strong text-text-strong`) |
| 등락률 | text-body-sm-strong | `cn("text-body-sm-strong", changeClass(...))` (이전 `text-mono-numeric` 무크기) | 동일(635줄) |
| breadth | text-caption | `text-caption text-text-muted` | 동일 톤 |
| 순번 | plain 넘버(회색 배지 없음) | `w-5 shrink-0 text-center text-caption font-bold tabular-nums text-text-muted` (이전 `inline-grid h-6 w-6 rounded-sm bg-surface-muted` 배지 제거) | 순위표 589줄 `text-center text-caption font-bold tabular-nums text-text-muted` 와 정합 |

PASS.

### AC3 기능 무회귀

| 항목 | 기대 | 실측 |
|---|---|---|
| 행 클릭 → 모달 | 정상 | `onClick={() => setSelected(sector)}` → `SectorConstituentsModal` 렌더 배선 무변경. PASS |
| 키보드 Enter/Space | 열림 | `ListRow` 는 `div` → `tabIndex={0}` + `onKeyDown`(Enter/Space, `e.preventDefault()` 로 Space 스크롤 차단) 추가. PASS |
| hover/focus bg | 유지 | `hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none` 유지 |
| aria | role/label 유지 | `role="listitem"` + `aria-label={sectorRowAria(sector.name)}` 유지. 상위 `role="list"` 유지 |
| 가용성/breadth/스켈레톤 로직 | 무변경 | `resolveAvailability`·loading/unavailable/empty 분기·`sector.total > 0` breadth 게이팅 diff 없음. PASS |

### AC4 토큰

| 재현 | 기대 | 실측 |
|---|---|---|
| `git grep -n sector-row-h -- '*.tsx' '*.ts' '*.css'` | 0 | 0 코드 참조 |
| theme.json / finsight-redesign.md(design:sync SSOT) | 제거 | 양쪽 `sector-row-h: 56px` 1줄 삭제 확인 |
| `npm run design:sync` 후 `git diff tailwind.theme.json` | diff 0(멱등) | 재sync 후 diff 0. PASS |

nit(비차단): `docs/design/trending-sectors.md`(트렌딩섹터 피처 DESIGN.md), `docs/HANDOFF.md`, `docs/qa/trending-sectors.md` 에 `sector-row-h` 문자열이 남아있다. 확인 결과 `design:sync` 는 `docs/design/finsight-redesign.md` **한 파일만** export 소스로 읽으므로(package.json `design:sync` 스크립트) 이 잔여물은 파이프라인·빌드에 영향 없는 이력/설명 문서다. 후속 정리 권고이나 본 PR 게이트 무관.

### AC5 게이트

| 명령 | 결과 |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint components/home/TrendingSectorsSection.tsx` | exit 0 |
| `rm node_modules && npm ci` (real 설치) | exit 0 |
| `npm run build` (Turbopack) | exit 0, 전 라우트 빌드 성공 |
| 신규 커스텀 Tailwind 클래스 | 0 — 사용 클래스(`-mx-sm`·`rounded-sm`·`px-sm`·`w-5`·`text-caption`·`font-bold`·`tabular-nums`·`text-body-sm-strong`·`border-border-line`·`py-md`·`gap-md`) 전부 `RealtimeRankingSection`(prod) 기존 사용 유틸 |

---

## 에지 케이스

- BE 다운(`curl 127.0.0.1:8000/health` → 000): 섹터 데이터는 FastAPI 가 아닌 KIS route handler 경유 — BE 무관. 홈 `GET / 200` 정상, 가용성 분기(`unavailable` → `MaintenanceNotice`)는 이번 변경 무영향(로직 무변경).
- Space 키 스크롤: `onKeyDown` 에 `e.preventDefault()` 있어 Space 로 열 때 페이지 스크롤 방지. OK.
- StrictMode 더블 마운트: 신규 effect 없음(기존 `useState(selected)` 만) — 부수효과 무. OK.
- 신규 색/폰트 토큰: 0. 전부 재사용.

## 라운드트립(렌더 스모크)

BE LIVE 불가(로컬 FastAPI 미기동, health 000) — 섹터는 KIS 프록시라 FastAPI 시나리오 무관. worktree `npm run dev`(Ready 198ms) → `GET / 200`(82KB), "지금 뜨는 산업" 섹션 렌더 확인, dev 로그 컴파일/런타임 에러 0. 검증 후 dev 종료·node_modules 심볼릭 복원.

밀도 육안 비교는 코드 정합으로 확정: `SectorRow` 와 `RankRow` 가 동일 `ListRow`·동일 순번/폰트 클래스 리터럴을 공유하므로 두 섹션 행 높이·헤어라인·폰트가 동일하게 렌더된다.
