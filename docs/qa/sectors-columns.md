# QA 리포트 — sectors-columns (PR #279)

- 대상 PR: #279 `fix(home): 지금 뜨는 산업 — 등락률·상승종목수 가로 컬럼 분리`
- 브랜치: `feature/sectors-columns` (커밋 `191afe0`)
- 성격: 경량 UX 폴리시 (PRD 없음). 변경 파일 1개 — `components/home/TrendingSectorsSection.tsx` (`SectorRow` 우측 구조, +14/-12).
- 검증 위치: 격리 worktree `/Applications/하영/code_source/tsf-wt-sectors-col` (공유 메인 트리 미접촉).
- 판정: **qa-passed** (실패 0건)

## 변경 개요
기존 `SectorRow` 우측이 `flex flex-col items-end` 로 등락률% + "N개 중 M개 상승"을 세로 스택 → 행 높이가 컸다(사용자 지적). 변경 후:
- 등락률 → `w-16 shrink-0 text-right` 고정폭 컬럼 (색 합성 클래스 `changeClass` 유지)
- 상승종목수(breadth) → `hidden w-32 shrink-0 text-right text-caption text-text-muted sm:block` 별도 가로 컬럼 (sm+ 노출, 모바일 숨김, `total===0` 은 빈 문자열)
- 두 컬럼 모두 `ListRow`(`flex items-center gap-md`)의 형제 → 한 줄 유지, 세로 스택 제거로 행 높이 축소.

## AC 별 검증

| AC | 기대 | 방법 | 실측 | 결과 |
|---|---|---|---|---|
| AC1 가로 컬럼 (sm+ 한 줄, 행 높이 축소) | 데스크탑에서 [순번][업종명][등락률][상승종목수]가 세로 스택 없이 한 줄 | 코드 구조 분석 + 컴파일 | `ListRow`=`flex items-center gap-md`. 자식 4개 모두 인라인 형제(`w-5` 순번 · `flex-1 truncate` 업종명 · `w-16` 등락률 · `w-32` breadth). 이전 `flex flex-col` 래퍼 제거됨 → 세로 스택 소멸, 단일 flex 행 | PASS |
| AC2 정렬 (w-16·w-32 고정폭 우정렬, total 0 정렬 유지) | 컬럼 정렬 맞음, total 0 은 빈칸이되 등락률 정렬 유지 | 코드 분석 | 등락률 `w-16 text-right`, breadth `w-32 text-right`, 둘 다 `shrink-0` → 행 간 컬럼 폭 고정. `total>0 ? sectorsBreadthSummary(...) : ""` — total 0 은 빈 문자열이지만 `w-32` span 은 여전히 렌더(sm+)되어 등락률 컬럼 위치 불변 | PASS |
| AC3 반응형 (<sm 숨김, 오버플로 없음) | 모바일에서 breadth 숨김, 순번·업종명·등락률만 한 줄, 세로깨짐 없음 | 코드 분석 | breadth span `hidden ... sm:block` → <640px 미렌더. 업종명 `min-w-0 flex-1 truncate` → 좁은 폭에서 말줄임 처리, 오버플로/래핑 없음 | PASS |
| AC4 무회귀 (모달·가용성·색·순번) | 클릭→구성종목 모달, 가용성(로딩/점검), 색(상승 빨강), 순번 plain 넘버 무변경 | diff 검토 | diff 는 우측 두 컬럼만 교체. `onClick`/`onKeyDown`/`SectorConstituentsModal`/`resolveAvailability`/`changeClass`(signal-up-text 등)/순번 span(`w-5 ... text-text-muted`) 전부 무변경 | PASS |
| AC5 게이트 (tsc·eslint 통과, 신규 커스텀 Tailwind 0) | 타입·린트 0 에러, 커스텀 토큰 신규 0 | 명령 실행 | `npm run typecheck` 0 에러 · `npm run lint` 0 에러 · 신규 클래스 `w-16`/`w-32`/`text-right`/`hidden`/`sm:block` 전부 Tailwind 기본 스케일(theme spacing/width 미오버라이드, 코드베이스 다수 파일서 기사용). 신규 커스텀 토큰 0 | PASS |

### 게이트 명령 출력
```
$ npm run typecheck   # tsc --noEmit
(0 에러, 무출력)

$ npm run lint        # eslint .
(0 에러, 0 경고)
```

## 빌드 검증 (worktree Turbopack 심볼릭 거부 → webpack 방식 명기)
- worktree `node_modules` 는 공유 메인 트리로의 심볼릭 링크. **Turbopack `next build`/`next dev` 양쪽 모두 `Symlink [project]/node_modules is invalid, it points out of the filesystem root` 로 FATAL 패닉** (문서화된 worktree 한계 — `reference` 메모리).
- 우회: `npx next build --webpack` (webpack 은 심볼릭 허용).
```
$ npx next build --webpack
✓ Compiled successfully in 5.1s
(전 라우트 정상 생성, / 홈 포함, 에러/경고 0)
```
→ 변경 컴포넌트 포함 전체 컴파일 성공.

## 육안(라이브) 검증 한계
- Turbopack `next dev` 도 동일 심볼릭 패닉으로 worktree 에서 dev 서버 구동 불가. 공유 메인 트리는 미접촉 원칙상 브랜치 체크아웃 회피.
- 변경이 **순수 className 구조 변경**(로직·페칭·타입 무변경)이고, 레이아웃이 `ListRow` 의 단일 `flex items-center` + 고정폭 자식으로 정적 판정 가능하며, tsc·eslint·webpack 컴파일이 모두 통과하므로 AC1~AC4 를 코드 구조 분석으로 판정. 육안 픽셀 확인은 PR 머지 후 Vercel preview/prod 에서 최종 확인 권장(위험 낮음).

## 공통 AC 무회귀
- BFF 원칙: 변경 파일에 `fetch(`·`127.0.0.1` 직접 호출 0건 (도메인 훅 `useQuerySectorRanking` 경유 유지).
- 한글 톤: `sectorsBreadthSummary` = `"${total}개 중 ${up}개 상승"` — 한글 유지, 카피 변경 없음.
- 접근성: `role="listitem"`, `tabIndex={0}`, `aria-label={sectorRowAria(...)}`, Enter/Space 키 핸들러 전부 무변경.
- 사이드 이펙트: `SectorRow` 주석(§102~104)이 여전히 "우: 등락률+breadth(세로)" 로 서술 — 실제 구현은 가로 컬럼으로 바뀌어 주석과 경미한 불일치(문서 정확성 nit, 기능 무영향). 라벨 게이트 무관.

## 에지 케이스
- `total===0` 업종(예: 제약, breadth 미집계): breadth 컬럼 빈 문자열 렌더 → 등락률 컬럼 정렬 유지. 확인.
- 가용성 unavailable(KIS 야간점검/에러): `MaintenanceNotice` 경로 무변경 → SectorRow 미렌더, 영향 없음.
- 긴 업종명: `min-w-0 flex-1 truncate` 로 말줄임 → 고정폭 우측 컬럼 침범 없음.

## 판정
- AC1~AC5 전부 PASS, 공통 무회귀 이상 없음. **qa-passed**.
