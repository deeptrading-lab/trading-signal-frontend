# QA 리포트 — verdict-card-redesign

- 대상 PR: #160 (`feature/verdict-card-redesign`)
- 제목: feat(ai-analysis): PM 결정 카드 컴팩트 리디자인 + 목표·손절 절대가격 표기
- 성격: **PRD 없는 경량 UX/기능 반복 작업** — `docs/prd/verdict-card-redesign.md` 미존재. PR 본문 + git diff 를 수용 기준(AC)으로 삼아 QA.
- 변경 파일 (5):
  - `components/stock/ai-analysis/FinalVerdictCard.tsx` (+121/-89 의 주축, 헤더/통계/강점·리스크 재배치 + `renderPctStat`)
  - `components/stock/ai-analysis/SlideToAnalyze.tsx` (스페이싱/폰트 클래스 + `pr-2`)
  - `app/api/stock/ai-analysis/route.ts` (+2: `finalDecision.base_price` 주입)
  - `lib/prompts/stock/aiAnalysis.ts` (+2: 개조식·명사 종결 문체 규칙)
  - `lib/types/stock/aiAnalysis.ts` (+2: `FinalDecision.base_price?: number | null`)
- 검증 환경: 로컬 macOS, BE(`127.0.0.1:8000`) 미기동(`HTTP_CODE:000`, connection refused).
- **브라우저 라운드트립 갈음 사유**: 대상 라우트 `/api/stock/ai-analysis` 는 SSE 스트림 + LLM CLI 의존의 **로컬 전용** 분석 경로다. 본 QA 환경에 FastAPI 엔진·LLM CLI 가 없어 실제 분석 1건도 생성 불가 → 절대가격/강점·리스크 2열/슬라이드 정렬의 **런타임 렌더는 코드·Tailwind 클래스 레벨 정적 검증으로 갈음**한다. 빌드·타입·테스트·린트는 실제 명령 출력으로 증빙.

## AC 별 검증

| # | AC | 재현 절차 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|---|
| 1 | 타입 안정성 | `npx tsc --noEmit` | exit 0 | exit 0, 출력 없음 | 통과 |
| 1 | 린트 | `npm run lint` | exit 0 | exit 0, 경고/에러 0 | 통과 |
| 1 | 빌드 | `npm run build` | exit 0 | exit 0, 전 라우트 정상 생성 (Proxy Middleware 포함) | 통과 |
| 2 | 절대가격 로직 — 직렬화/테스트 무회귀 | `npm test` 전체 + `decisionStore.test`·`backfillDecisions.test`·`aiAnalysis.test` 개별 | optional `base_price` 추가가 기존 테스트 무영향 | 전체 **495 passed / 1 skipped(live backtest)**. 명시 3종 **16 passed**. `decisionStore` 가 `decision` 객체 통째로 `JSON.stringify`(line 154-157) → JSONB 투명 직렬화, 스키마 변경 0 | 통과 |
| 2 | `renderPctStat` 폴백 정확성 (코드리뷰) | `FinalVerdictCard.tsx` L124-143 정독 | `base_price` 없으면 `±N%`만, 있으면 `절대가격(±N%)` | `basePrice = typeof === "number" && > 0 ? … : null` 가드가 `null`·`undefined`·`NaN`·`0`·음수 전부 차단 → `%` 폴백. `Math.round(basePrice*(1+pct/100))` + `toLocaleString("ko-KR")`. target 분기는 호출 전 `!data.target_pct ? "—"` 선차단. 음수 pct(손절)는 `-` 유지, 양수만 `+` 부착 | 통과 |
| 3 | route.ts `base_price` 주입 — final 이벤트·upsert 양쪽 | `route.ts` L655-687 정독 | `priceData?.price ?? 마지막 봉 종가` 가 `finalDecision` 에 실리고 SSE final·upsert 둘 다 포함 | L674 `base_price: priceData?.price ?? sorted[sorted.length-1]?.close ?? null` 가 `finalDecision` 단일 객체에 설정 → L680 `send({type:"final", data:finalDecision})`, L681 `upsertAIDecision({decision:finalDecision,…})` 가 **같은 객체** 사용 → 두 경로 모두 포함 보장 | 통과 |
| 4a | 강점/리스크 반응형 | `grep` 클래스 문자열 | `grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x` | L325 verbatim 일치. 자식 `min-w-0 leading-relaxed`(긴 내용 줄바꿈) 적용 | 통과 |
| 4b | 통계 박스 반응형 | `grep` 클래스 문자열 | `grid-cols-1 sm:grid-cols-3` | L269 verbatim 일치. `statCx` 는 `flex items-center justify-between`(라벨 좌·값 우 한 줄) | 통과 |
| 4c | 슬라이드 스위치 정렬/너비 | `SlideToAnalyze.tsx` diff·정독 | PR 본문: `flex-1 justify-center` + `sm:min-w-[…]` | **PR 본문 prose 와 구현 불일치** — `flex-1`·`justify-center`·`sm:min-w-[…]` **미존재**. 실제 구현은 기존 `justify-between` 유지 + 도착 라벨에 `pr-2` 신규 + 내부 `gap-4→gap-2`·`px-3→px-2.5`·`gap-1.5→gap-1`·`text-[12px]→text-[13px]` 스페이싱/폰트 보정. **기능·렌더는 정상**(라벨이 우측 끝에서 안쪽으로 당겨짐), aria/role 무변경 | 통과(주1) |
| 4 | 토큰 정합 (hex/px 직타) | 변경 2파일 `#hex` grep + arbitrary class 대조 | hex 0건, px 직타는 기존 컨벤션 한정 | hex **0건**. arbitrary `text-[Npx]`/`min-w-[64px]` 는 본 파일 **기존 컨벤션**(main 이미 `text-[9/10/11px]` 사용) 연장 — 신규 토큰 위반 아님 | 통과 |
| 5 | BFF 패턴 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` + 변경 컴포넌트 `fetch(` grep | client `fetch(` 0건, 직접 FastAPI 호출 0건 | 변경 컴포넌트 `fetch(` **0건**. `127.0.0.1` 2건은 `app/api/workbench/_adapters/fastapi.ts` (route handler `FASTAPI_BASE_URL` fallback — 문서화된 예외) | 통과 |
| 5 | 한글 카피 원칙 | 변경 컴포넌트 노출 문구 + 프롬프트 규칙 grep | 사용자 노출 한글 유지 | 카드 노출 문구 전부 한글("신호 강도"·"확신도"·"높음/보통/낮음"·"진입 없음"), 가격은 `toLocaleString("ko-KR")`. 프롬프트는 **명사 종결 문체 규칙** 추가로 한글 톤 강화 | 통과 |

(주1) AC-4c: **PR 본문 텍스트가 실제 diff 와 어긋난다**(본문은 `flex-1 justify-center`·`sm:min-w` 를 명시하나 코드엔 없고 `pr-2`+스페이싱 보정으로 동일 시각 의도 달성). **기능 결함 아님** — 빌드/타입/린트/테스트 전부 통과하고 슬라이드 스위치는 정상 렌더·동작. 다만 PR 본문의 변경 설명 정확성 보강 권장(후속, 머지 차단 사유 아님).

## 공통 AC 요약

- typecheck / lint / build: 전부 exit 0 (실측 출력 증빙).
- BFF 원칙: client `fetch(` 0건, `127.0.0.1` 은 route handler adapter fallback 한정.
- 한글 톤: 카드 노출 문구·가격 로케일 전부 한글, 프롬프트 명사 종결 규칙 추가로 톤 강화.
- 접근성: `SlideToAnalyze` aria/role(+`role="radiogroup"/"radio"`·`aria-checked`·`aria-busy`·`aria-label`·`sr-only role="status"`) **추가·삭제 0건** — 스페이싱/폰트 클래스만 변경, 무회귀. `FinalVerdictCard` 헤더 강조 박스·보정 배지는 근거를 `title` 툴팁으로 제공(라벨 텍스트 동반).

## 에지 케이스

- **legacy 행 (`base_price` 미존재)**: optional 필드 → `data.base_price === undefined` → `basePrice = null` → `renderPctStat` 가 `±N%` 만 표기(폴백). 기존 카드 무파손. ✔
- **`base_price` 비정상값**: `NaN`/`0`/음수/문자열 모두 `typeof === "number" && > 0` 가드에서 탈락 → `%` 폴백. ✔
- **target_pct 0/null**: 호출 전 `!data.target_pct ? "—"` 선차단 → `renderPctStat` 미진입. ✔
- **stop_loss_pct 항상 값 존재**: route 가 `rawStop`(기본 -5) 정규화 → `NaN` 도달 불가. ✔
- **절대가격 반올림**: 현재 `Math.round`(원 단위). 호가단위(틱) 미반영 — PR `## 다음 작업` 에 검토 항목으로 명시됨(MVP 수용). ⚠(후속)
- **JSONB 직렬화**: `decisionStore` 가 `decision` 객체 전체 `JSON.stringify` → optional 필드 자동 포함/생략, DB 스키마 변경 불필요. ✔
- **StrictMode 더블 마운트 / Tailwind preflight**: 본 PR 은 순수 표현(클래스/렌더)·prop 추가만 — 신규 effect·전역 CSS·preflight 잔여물 없음. 무관. ✔
- **DESIGN.md 토큰 라이브 동기화**: 본 PR 토큰 미변경(hex/px 직타 0, `tailwind.theme.json` 무관) → 토큰 동기화 검증 비대상.

## 라운드트립 (BE LIVE) — 비수행 사유

- `curl -m3 http://127.0.0.1:8000/health` → `HTTP_CODE:000`(connection refused). BE 미기동.
- 대상 라우트는 SSE + LLM CLI 의존 **로컬 전용** 분석으로 본 QA 환경에서 실분석 생성 불가 → 절대가격 표기/강점·리스크 2열/슬라이드 정렬의 **런타임 시각 검증은 코드·클래스 레벨로 갈음**.
- 갈음 근거: (a) 클래스 문자열이 PR 명세와 verbatim 일치(4a·4b), (b) `base_price` 데이터 경로가 final·upsert 양쪽 단일 객체로 보장(AC-3), (c) `renderPctStat` 분기·가드 코드리뷰로 폴백 정확성 확인, (d) build/typecheck/lint/test 전부 통과로 JSX·타입 무결성 확정.
- TODO(머지 후 라이브 환경): 재분석 1건 생성 후 PC(1280)·모바일(375) 두 뷰포트에서 절대가격 `72,000(-11%)` 표기·강점/리스크 2열·슬라이드 라벨 위치·PM 명사 종결 문체 샘플 육안 확인(PR `## 다음 작업` 과 정합).

## 판정

- AC 전부 통과(실패 0건). AC-4c 는 **PR 본문 설명 정확성 노트 1건**(기능 결함 아님, 머지 비차단).
- PR 본문 `## 다음 작업` 섹션 존재 확인(틱 반올림·legacy 백필 안내·명사 종결 샘플 검증 — 모두 본 PR 머지 후 후속) → 라벨 게이트 통과.
- 판정: **qa-passed**
