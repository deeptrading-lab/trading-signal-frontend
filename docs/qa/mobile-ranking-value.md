# QA 리포트 — 실시간 순위 값 모바일 노출 (mobile-ranking-value)

- **대상 PR**: #263 `feature/mobile-ranking-value`
- **성격**: 경량 UX 폴리시 (PRD 없음 — 위임 AC 로 대체)
- **변경 파일**: `components/home/RealtimeRankingSection.tsx` 단일 (RankRow 종목 셀에 `md:hidden` 캡션 1블록, +7줄)
- **검증 위치**: 격리 worktree `/Applications/하영/code_source/tsf-wt-mobile-value` (브랜치 `feature/mobile-ranking-value`)
- **판정**: **qa-passed** (실패 0건)

## 환경 제약 (라이브 라운드트립 불가 — 사유 명기)

이 worktree 의 `node_modules` 는 공유 메인 트리 심볼릭 링크다. Next 16 Turbopack `dev`/`build` 는 심볼릭 node_modules 를 거부한다(문서화된 랜드마인 — `reference_tailwind-attribute-selector-apply-landmine` 계열, 실측 재현 아래).

```
$ npm run dev
▲ Next.js 16.2.6 (Turbopack)
✓ Ready in 254ms
FATAL: An unexpected Turbopack error occurred.
Error [TurbopackInternalError]: Symlink [project]/node_modules is invalid, it points out of the filesystem root
```

- 공유 메인 트리는 병렬 세션 소유 → 브랜치 체크아웃/빌드 금지(격리 규칙).
- BE(`127.0.0.1:8000`) 다운(`curl` HTTP 000) — 라이브 랭킹 데이터 페치도 불가.

→ **본 변경은 순수 프레젠테이션(조건부 `<span md:hidden>` 1개, 신규 클래스 0)** 이며 반응형 노출/숨김은 표준 Tailwind `md:hidden` vs `hidden md:block` 로 정적으로 완전 결정된다. 라이브 브라우저 캡처 대신 **소스 정적 검증 + 게이트 명령 실측**으로 AC 를 판정한다(CSS-only 폴리시에 비례). 값 정합(AC3)은 md+ 컬럼과 **동일 함수 인스턴스**를 호출하므로 구성상 보장.

## AC 별 검증표

| AC | 재현/검증 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 모바일 값 노출 | `RankRow` L608–612: `{valueColumn && <span className="... md:hidden">{valueColumn.label} {valueColumn.format(row)}</span>}`. `valueColumnForTab`(L172) 은 `volume`→거래량, `turnover`/`surge`/`plunge`→거래대금 반환(4탭 모두 non-null). 캡션은 종목 셀(`flex-col`) 내부 = 종목명 아래 스택. | <md 에서 4탭 각 행에 정렬 기준 값 캡션 노출 | 4탭 모두 `valueColumn` non-null → 캡션 렌더. 거래량 탭=거래량, 나머지 3탭=거래대금. 종목명 아래 배치 확인 | PASS |
| AC2 md+ 무중복 | 캡션 span `md:hidden`(L609). md+ 전용 값 컬럼(L633–637)은 `hidden ... md:block` grid 트랙. 헤더도 대칭(L420–424). | md+ 에선 캡션 숨고 우측 전용 컬럼만 | md+ 에서 캡션 `md:hidden`→display:none, 전용 컬럼 `md:block`→표시. 상호배타(중복 0) | PASS |
| AC3 값 정확성 | 캡션 `valueColumn.format(row)`(L610) 이 md+ 컬럼 `valueColumn.format(row)`(L635) 과 **동일 함수·동일 row**. 포맷터 fail-soft `-` (`formatShareVolume`/`formatWonCompact` 은 `null`·`NaN`·`<=0`→`"-"`). | 캡션 값 = 우측 컬럼 값, 미보유 `-` | 동일 `ValueColumn.format` 인스턴스 호출 → 출력 항상 일치. fail-soft `-` 상속 | PASS |
| AC4 레이아웃 | 캡션은 grid 트랙 아님 — 종목 셀 `<div className="flex min-w-0 flex-col gap-xs md:flex-row">`(L586) 내부 자식. 모바일 스택: [로고+종목명]→[경고배지(hasBadges 시)]→[값 캡션]. grid 트랙(L100–104)은 변경 없음. `min-w-0` 로 shrink 허용, 캡션 텍스트 짧음(예 "거래대금 5.3조"). | 행 높이만 늘고 깨짐/세로깨짐/오버플로 없음. 배지 행도 정상 스택 | 모바일 grid 5트랙 불변(캡션 셀 내부 배치). flex-col 자식 full-width → 한글 세로깨짐 불가. 배지→값 순 스택 정상 | PASS |
| AC5 무회귀 | `git show` diff = **7줄 순수 추가**, 삭제/수정 0. 캡션은 `md:hidden` 게이트 → md+ 경로 완전 무변경. grid 트랙·경고배지·위험숨기기·가용성·관심토글·행클릭/peek 코드 미접촉. | md+ 및 전 기능 무영향 | 추가 전용 diff. md+ 렌더 트리 불변. 기존 로직 미접촉 확인 | PASS |
| AC6 게이트 | `npm run typecheck`, `npm run lint`(full), 파일 단위 eslint, 신규 클래스 리터럴 부재 확인 | tsc/eslint 0 에러, 새 클래스 없음 | 아래 명령 출력 참조 | PASS |

### AC6 게이트 실측

```
$ npm run typecheck   # tsc --noEmit
(에러 0 — 무출력 종료)

$ npm run lint        # eslint .
(에러 0 — 무출력 종료)

$ npx eslint components/home/RealtimeRankingSection.tsx
ESLINT EXIT: 0
```

**신규 클래스 리터럴 0 확인** — 캡션이 쓰는 `text-caption`·`tabular-nums`·`text-text-muted`·`md:hidden` 은 모두 동일 파일/코드베이스에 이미 방출된 유틸(예: `RealtimeRankingSection.tsx` L112·L581, `InvestorFlowTop10Card.tsx` L207). 따라서 Turbopack build 를 worktree 에서 못 돌려도 **Tailwind JIT 미방출 리스크 0**(신규 통짜 클래스 문자열 없음). build 는 심볼릭 node_modules 제약으로 worktree 미실행, 공유 트리 격리 규칙으로 미실행 — 리스크 근거 위와 같이 대체 검증.

## 공통 AC 무회귀

| 항목 | 결과 |
|---|---|
| BFF 원칙 | 변경 파일에 `fetch(`/`http://127.0.0.1` 도입 0 (프레젠테이션만). |
| 한글 톤 | 캡션 라벨 = `RANK_COL_VOLUME`("거래량")·`RANK_COL_TURNOVER`("거래대금") 기존 카피 재사용. 신규 문자열 0. |
| 접근성 | 캡션은 시각 보조 텍스트(순수 정보). 행 `aria-label`·관심 토글 `aria-pressed`·Tab 순서 미변경. `md:hidden` 이라 md+ 스크린엔 미노출(전용 컬럼이 대체). |

## 에지 케이스

| 케이스 | 동작 | 판정 |
|---|---|---|
| 값 미보유(`tradingValue`/`volume` null·NaN·0) | 포맷터 fail-soft → 캡션 "거래대금 -" / "거래량 -" (md+ 컬럼과 동일) | PASS |
| 경고배지 있는 행 | 종목 셀 flex-col 스택 [종목명]→[배지]→[값 캡션], 오버플로 없음 | PASS |
| 값 컬럼 없는 탭(가정) | `valueColumn === null` → 캡션 미렌더(현 4탭 전부 값 보유라 실발생 없음, 방어만) | PASS |
| md↔모바일 리사이즈 | `md:hidden`/`md:block` 순수 CSS 미디어쿼리 — JS·hydration 무관, 리사이즈 즉시 전환 | PASS(정적) |

## 라운드트립 (BE LIVE)

미실행 — BE 다운(HTTP 000) + worktree Turbopack 심볼릭 node_modules 거부로 dev 서버 기동 불가. 본 변경이 데이터 페치/BFF 무관한 CSS-only 폴리시임을 근거로 정적 검증으로 대체(사유 상단 명기). 값 정합(AC3)은 md+ 컬럼과 동일 함수 재사용으로 구성상 보장되어 별도 라이브 대조 불요.

## 결론

6개 AC 전부 PASS, 공통 무회귀 클린, 에지 케이스 이상 없음. **qa-passed**.
