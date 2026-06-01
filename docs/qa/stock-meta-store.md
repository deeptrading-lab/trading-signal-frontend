# QA 리포트 — stock-meta-store (Phase 1+2 스택)

**대상**: `git diff main...feature/stock-meta-store` — 스택 5건(#71 test 현행화 / #72 모달 지연로드 / #73 pickStockName / #74 파생 state 제거 / #76 zustand 스토어) + sibling #75(docs). PRD: [docs/prd/stock-meta-store.md](../prd/stock-meta-store.md).
**판정: PASS** · **리뷰: APPROVE(코드)** · 블로킹 결함 0.

## 자동화 결과
| 명령 | 결과 |
|---|---|
| `npm run typecheck` | PASS (무에러) |
| `npm run lint` | PASS (무에러) |
| `npm run test` | PASS — **30 files / 189 tests** (신규 `stockMetaStore`(4)·`resolveStockName`(4) 포함) |
| `npm run build` | PASS — 컴파일·페이지 생성·미들웨어 정상 |

## PRD AC 판정 (요약)
| AC | 내용 | 판정 |
|---|---|---|
| AC-1 | `useStockMetaStore` 신설·persist 없음·`upsertQuotes` 부분병합(이름 보존) | PASS |
| AC-2 | placeholderData 즉시 페인트(코드+빌드 근거 — 라이브는 헤드리스 한계) | PASS(코드) |
| AC-3 | 값 없는 직접 진입 = 기존 로딩(회귀 0) | PASS |
| AC-4 | QueryCache.onSuccess 가 watchlist.list·stock.price 만 upsert | PASS |
| AC-5 | 휘발성(localStorage 미사용) | PASS |
| AC-6 | typecheck/lint/test/build + 동작 보존 | PASS |

## 동작 보존 (#72/#73/#74)
- **#72** 모달 조건 렌더 — 종전 항상 마운트(`open` 토글) → `{modalOpen && …}` + `next/dynamic`. 모달은 종료 애니메이션 없음(`!open`시 `return null`), effect cleanup(포털 제거·focus 복귀·aria 복원·keydown)가 unmount 시 동일 실행 → 회귀 없음(포털 div 가 닫힘 시 제거돼 오히려 깔끔).
- **#73** `pickStockName` — StockHeader 옛 로직과 수학적 동치(빈값/ticker-동일 스킵 후 첫 유효값, 없으면 ticker). WatchlistContainer 는 의도적 `null` 유지(디그레이드 행). 단위테스트 4건 고정.
- **#74** 파생 state 제거 — `open && kw===0 ? readRecentSearches() : []`. 닫힘 시 빈 배열로 SSR/초기 렌더 일치(hydration 안전).

## 공통 AC
- BFF 원칙(클라 직접 fetch 0) · 한글 톤 · 접근성 유지 — 통과.

## 리뷰(요약) — APPROVE
타입 안전(`Query<unknown,unknown>`·`satisfies StockPrice`·`StockQuoteInput` 구조 호환), 휘발성 스토어 3계층 분리 정합, 보안 이슈 0. **비차단 nit 4건(후속 권고)**:
1. `app/providers.tsx` — `getState().upsertQuotes` 조회를 매칭 분기 안으로 이동(비매칭 쿼리마다 불필요 조회 회피).
2. `StockSearchContainer`/`WatchlistContainer` — `s.quotes` 전체 구독 → 무관 upsert 시 리렌더. 소규모라 허용, 필요시 셀렉터 축소.
3. `useQueryStockPrice` — placeholderData 가 시점 스냅샷(재검증)임을 1줄 주석.
4. providers 라우팅 키 prefix 상수화(stringly-typed 결합 완화).

## 한계
- 라이브 즉시-페인트(AC-2)·새로고침 초기화(AC-5) 체감은 머지 후 preview 에서 확인 권장(헤드리스 실측 불가).

## 머지 게이트 비고 (스택 PR)
- 본 작업은 **5-PR 스택**으로 단일 PR 룰과 다르다. `handoff-append`(qa-passed 트리거)는 PR head 브랜치에 HANDOFF 커밋을 추가하므로, **스택 전체에 qa-passed 를 일괄 부여하면 머지 시 docs/HANDOFF.md 충돌** 위험. → 라벨 체인(qa-passed→review-approved)은 **머지 시점에 PR 단위로 아래부터** 부여 권장.
