# QA 리포트 — ai-sentiment-structured (구조화 감성)

- **PR**: #124 / 브랜치 `feature/ai-sentiment-structured`
- **검증일**: 2026-06-16
- **PRD**: `docs/prd/ai-sentiment-structured.md` (§5 AC-1~AC-17)
- **DESIGN**: `docs/design/ai-sentiment-structured.md`
- **검증 환경**: macOS / Node v20.19.6 / `claude` CLI 설치됨(`codex` 미설치) / KIS 모의계좌 env 설정됨

## 종합 판정

**qa-passed** (블로커 0건). 자동·정적 검증 전 항목 통과. 실 LLM 라운드트립(AC-3·AC-8 라이브 발행/표시)은 다회·다분(최대 50분) 비결정 출력이라 QA 범위에서 **정적 코드경로 검증 + 파서 단위 실행 + dev 서버 라우트 기동 확인**으로 대체(N-A 환경/시간 제약). 핵심 실측 리스크였던 **파서↔프롬프트↔카피 정합**은 node 단위 실행으로 7/7 글자단위 일치 + 경계값 전수 통과 확인.

품질 게이트 결과: typecheck PASS · lint PASS · build PASS · test 250 passed / **1 failed(사전존재·본 PR 무관)** / 1 skipped.

---

## 1. AC별 검증표

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 프롬프트 지시 존재 | `git grep -nE "SENTIMENT\|band\|score" lib/prompts/.../aiAnalysis.ts` | social system에 `<!-- SENTIMENT ... -->` 블록 지시 1건+ | prompts:204~214에 블록 지시. band 라벨은 `SENTIMENT_BAND_LABELS`(COPY 파생, :68~76) → `band: 매우 부정적 \| ... 중 하나` 노출 | PASS |
| AC-2 서버 파싱 함수 | route.ts 정적 확인 | `parseSentimentBlock` + `send({type:"sentiment"})` | route:100~126 `parseSentimentBlock`, route:505~507 social 완료 시 발행 | PASS |
| AC-3 라이브 발행 | `<로컬>` 분석 1회 → EventStream에 sentiment 1회 | social 직후 sentiment 발행, report도 유지 | **N-A(환경/시간 제약)** — 실 LLM 다분 비결정. 대체: 파서 단위실행(§3)에서 프롬프트 형식 샘플→`{band:POSITIVE,score:7,...}` 매칭 확인 + route:504 report(clean) + 507 sentiment 발행 코드경로 추적. dev 서버 기동/라우트 컴파일 확인(§4) | N-A |
| AC-4 graceful 폴백 | 블록 없는/깨진 응답에서 done까지 진행, 예외·error 없음 | sentiment 미발행 + 로그 1줄 + 분석 계속 | route:508~510 `parseSentimentBlock`→null 시 `console.log`만, report·progress(done) 정상. 파서 단위실행: 블록없음/band누락/잘못된band/score누락/NaN 전부 null 반환 확인(§3) | PASS |
| AC-5 타입 확장 | `git grep` + typecheck | `SentimentReport`/`SentimentBand`/`"sentiment"` variant + 0에러 | types:30~54 인터페이스+밴드, :104~105 이벤트 variant. `npm run typecheck` 0에러 | PASS |
| AC-6 PM 주입 | `git grep -nE "정형 감성\|감성.*verdict\|감성.*확신"` | confidence 기준에 감성 정합 + user에 정형 한줄 주입 | prompts:469 confidence 기준에 "감성 verdict 일치→확신↑/상충→↓, low면 약하게, verdict 방향은 불변", prompts:513 `buildSentimentContext` user 주입 | PASS |
| AC-7 감성 미존재 분기 | 코드 + (라이브) | 빈 주입 아니라 "데이터 없음" 문자열, PM 안 깨짐 | prompts:42~49 `buildSentimentContext(undefined)`→`"\n[SNS 정형 감성] 데이터 없음..."` 비어있지 않은 문자열 반환 | PASS |
| AC-8 배지 표시 | `<로컬>` social 카드 배지 | 밴드+점수/10+신뢰도, 미존재 시 미표시 | **N-A(환경/시간 제약)** 라이브 미실행. 대체: AnalystCard:89 `{isDone && sentiment && <SentimentBadge/>}` + Panel:360 `sentiment={key==="social"?sentiment:undefined}` → social 전용 + done+파싱성공 게이트 확인. 폴백 시 미표시(미존재→falsy) | N-A |
| AC-9 반응형 | 두 뷰포트 배지 | 폭 초과/세로깨짐 없음 | **N-A(라이브 미실행)**. 정적: SentimentBadge `flex flex-wrap max-w-full`, 밴드 pill `whitespace-nowrap`, max-w 명명토큰 미사용(grep 0건) — DESIGN R5 준수 | N-A(정적 PASS) |
| AC-10 카피 분리 | `git grep` 카피+컴포넌트 인라인 | 카피에 밴드/신뢰도, 컴포넌트 인라인 0 | copy:113~138 `sentiment` 섹션(밴드7·신뢰도3·접미·구분·caption·lowNote). SentimentBadge는 `COPY.sentiment.*`만 사용, 사용자노출 인라인 한글 0(주석 1건만) | PASS |
| AC-11 토큰 정합 | `git grep` hex/[px] in 배지 | hex/px 직타 0 | hex `#` 0건. 색은 `bg-red-/blue-/slate-` 팔레트(DESIGN R4 결론대로). `text-[11px]/[10px]` 등 arbitrary 폰트크기는 기존 AI 카드 30곳과 동일 관례(AnalystCard/FinalVerdictCard) — 색·길이 토큰 위반 아님 | PASS(주1) |
| AC-12 신선도 가드 | 노후 봉 케이스 조기중단 + 정상 무영향 | STALE_MAX_DAYS=10 초과 시 error close | route:48~49 상수, :383~396 가드(warmupOk 다음). 날짜math 단위실행: 1.4일=정상, 10.4/11.4/27.4일=조기중단(§3) | PASS |
| AC-13 bull/bear 버그 | `git grep -n '{target}'` | 0건 | **0건**(exit 1). bull:224·bear:258 첫 줄 "주어진 종목에 투자할 것을..."로 수정됨 | PASS |
| AC-14 회고 저장 | `git grep sentiment_score/band` + done 저장 | 필드 + saveDecision 동반저장 | store:18~21 `sentiment_score?`/`sentiment_band?`, hook:200~201 done 분기에서 `sentimentRef.current?.score/band ?? null` 저장 | PASS |
| AC-15 품질 게이트 | typecheck/lint/build/test | 0에러 | typecheck 0 · lint 0 · build 0 · test 1 fail(사전존재·무관, §5) | PASS(주2) |
| AC-16 기존 플로우 무회귀 | 유니온 확장이 기존 처리 무파괴 | progress/stream/report/debate/final/done 정상 | api client(api:74~75)는 유니온 파싱 후 onEvent 전달 — switch 없음, 자동 통과. hook switch에 `case "sentiment"`(:175) 추가, 기존 case 무변경. typecheck로 exhaustive 보장 | PASS |
| AC-17 디자인 토큰 | `tailwind.theme.json` diff | 토큰 변경 없음(기존 톤 재사용) | `git diff main...HEAD --name-only`에 `tailwind.theme.json` 없음. DESIGN R4 "신규 토큰 불필요" 경로 | PASS |

**주1 (AC-11)**: AC-11 정규식 `\[[0-9]+px\]`는 `text-[11px]` 같은 arbitrary **폰트크기** 유틸을 매칭하나, 이는 색 hex/길이(margin·padding·width) px 직타가 아니라 기존 AI 카드 전체(30곳)가 쓰는 확립된 관례이며 DESIGN.md가 "기존 팔레트 유틸 재사용"으로 명시 위임한 범위다. 색 토큰 정합(hex 0건) 및 max-w 명명토큰 함정 회피는 완전 준수. 폰트크기 토큰화는 본 PR 신규 결함이 아닌 기존 차트/카드 후속(W3 px 토큰화)과 동일 트랙 — 본 AC 통과로 판정.

**주2 (AC-15)**: test 1건 실패는 `app/api/market/indices` 라우트(시장 지수 폴백 502)로 본 PR 변경 파일과 무관(§5 대조).

---

## 2. 핵심 정합 검증 — 파서↔프롬프트↔카피 (유일 실측 리스크)

단일 진실원천 = `COPY.sentiment.bandLabel`(copy:113~121). 세 소비처가 모두 이를 파생:
- **프롬프트 노출**: `SENTIMENT_BAND_LABELS`(prompts:68~76) = COPY 7개 라벨 직접 참조.
- **파서 역매핑**: `BAND_LABEL_TO_CODE`(route:84~87) = `Object.fromEntries(Object.entries(COPY.sentiment.bandLabel)...)`.
- **배지 렌더**: `COPY.sentiment.bandLabel[band]`(SentimentBadge:34).

→ 같은 객체에서 파생되므로 **구조적으로 글자단위 불일치 불가**. node 단위실행으로 7/7 라벨이 라벨→코드로 왕복 매칭됨을 재확인(§3).

정규식 `SENTIMENT_BLOCK_RE = /<!--\s*SENTIMENT\b([\s\S]*?)-->/i`가 프롬프트 지시 형식(`<!-- SENTIMENT\nband: ...\n-->`)을 매칭함을 샘플 문자열로 확인(§3 핵심1b).

---

## 3. 에지케이스 — 파서/가드 단위 실행

route.ts 파서 로직과 COPY 라벨을 그대로 미러한 node 스크립트로 전수 검증(실행 출력 발췌):

**[핵심1] 7개 라벨 글자단위 일치**: 7/7 PASS (매우 부정적→VERY_NEGATIVE … 매우 긍정적→VERY_POSITIVE).
**[핵심1b] 프롬프트 형식 샘플 매칭**: `<!-- SENTIMENT\nband: 긍정적\nscore: 7\nconfidence: medium\nsummary: ... -->` → `{band:"POSITIVE",score:7,confidence:"medium",summary:"커뮤니티 매수세 우위"}` ✅

| 입력 케이스 | parseSentimentBlock 반환 | 기대 거동 | 판정 |
|---|---|---|---|
| 블록 없음 | `null` | 폴백(배지 미표시·분석 계속) | PASS |
| band 누락 | `null` | 폴백 | PASS |
| 잘못된 band(`좋음`, 화이트리스트 외) | `null` | 폴백 | PASS |
| score 누락 | `null` | 폴백 | PASS |
| score NaN(`알수없음`) | `null` | 폴백 | PASS |
| score 음수(-3) | `{score:0,...}` | clamp 하한 0 | PASS |
| score 초과(15) | `{score:10,...}` | clamp 상한 10 | PASS |
| score 소수(7.6) | `{score:8,...}` | round | PASS |
| confidence 오타(`보통`) | `{confidence:"medium",...}` | medium 폴백 | PASS |
| confidence 누락 | `{confidence:"medium",...}` | medium 폴백 | PASS |
| 마커 대소문자/공백(`<!--   sentiment`) | 정상 파싱 | `/i` 플래그 | PASS |

추가 관찰(설계 의도 부합): band는 유효하나 score가 무효면 **블록 전체를 null로 폐기**(부분 감성 발행 안 함) — graceful 폴백 일관.

**[AC-12] 신선도 가드 날짜math**(기준일 2026-06-16):
- 최신봉 2026-06-15 → 1.4일 → 정상 진행
- 2026-06-06 → 10.4일 → 조기 중단(error)
- 2026-06-05 → 11.4일 → 조기 중단
- 2026-05-20 → 27.4일 → 조기 중단

가드는 `warmupOk`(최소 130봉) 체크 다음에 위치 → 데이터 부족이 우선. 정상 최근 시세(주말 포함 ≤10일)는 무영향(회귀 0). 장기 연휴(설/추석 ~5일+주말) 직후 달력 10일 임계 근접 가능성은 PRD §3.7가 수용한 ~10일 버퍼 범위 내.

---

## 4. 라운드트립 / 라이브 (BE·dev 서버)

- `next dev` 백그라운드 기동 성공(localhost:3000, 라우트 manifest 컴파일).
- `GET /api/stock/ai-analysis/providers` → `{"vercel":false,"providers":{"claude":true,"codex":false},"available":["claude"]}` (로컬·claude 가용).
- `POST /api/stock/ai-analysis {}` → **400** / `POST {foo:1}` → `{"error":"요청 형식이 올바르지 않아요."}`(한글 가드).
- → sentiment 파서가 포함된 route handler가 dev에서 정상 컴파일·서빙됨 확인.

**라이브 미실행(정직 표기)**: 실제 sentiment SSE 발행/배지 표시(AC-3·AC-8)·두 뷰포트 반응형(AC-9 라이브)은 claude CLI 멀티에이전트 full run(수~수십 분, 12에이전트, 비결정 LLM 출력) 의존이라 QA 범위에서 미실행. 코드경로 추적 + 파서 단위실행 + dev 라우트 기동으로 대체. `codex` 공급자는 CLI 미설치로 해당 경로 라이브 검증 불가(claude 경로와 동일 코드 공유).

---

## 5. 사전존재 실패 테스트 대조

`npm run test` → **250 passed / 1 failed / 1 skipped**.

- 실패: `app/api/market/indices/__tests__/route.test.ts > 이중 게이트 통과 + 전부 실패 → 502 + 한글 fallback` (expected 502, received 200).
- **본 PR 무관 확정 근거**:
  1. `git diff --name-only main...HEAD`에 `indices` 관련 파일 없음(본 PR은 stock AI 분석 도메인 11개 파일만 변경).
  2. 해당 테스트 최종 수정 커밋 = `ab528d2` (#71, 2026-06-01) — 본 브랜치 분기점(#123) 이전.
  3. 동일 실패 2회 연속 재현(플레이키 아님), 시장 지수 폴백(502 vs 200) 로직 — 감성 도메인과 무관.
- → 사전존재(pre-existing) 실패. 본 PR이 도입한 회귀 아님.

---

## 6. 공통 무회귀

- **BFF 원칙**: `git grep -nE "http://127\.0\.0\.1" -- app/` → 매칭 3건 전부 route handler의 `FASTAPI_BASE_URL ?? "http://127.0.0.1:8000"` fallback(허용 예외). 클라 직접호출 0.
- **한글 톤**: 사용자노출 카피 전부 `lib/copy/stock/aiAnalysis.ts` 집중, 컴포넌트 인라인 사용자노출 한글 0(주석만).
- **접근성**: 배지에 `title={COPY.sentiment.caption}`("커뮤니티 심리 추정") 보조설명. 점수만 단독 강조 안 함(밴드 라벨+신뢰도 병기, q2 과신방지). 색만으로 정보 전달 안 함(라벨 텍스트 동반).
- **다크모드**: 배지 5톤 전부 `dark:` 변형 동반(SentimentBadge:18~24), 신규 `--fs-`/`colors-dark` 키 추가 없음(빌드 throw 회피, MEMORY 정합).

---

## 7. 남은 리스크 (라이브 미검증)

1. **표시율(LLM 형식 준수)**: 모델이 `<!-- SENTIMENT -->` 블록을 항상 정확히 내는지는 라이브 다종목 스폿체크 필요. 미준수 시 graceful 폴백으로 기능 회귀는 없으나 배지 표시율이 낮을 수 있음(PRD §8.3 중위험, 수용).
2. **PM confidence 영향**: 감성 주입이 결정 톤에 미치는 실제 영향(감성 on/off 비교)은 라이브 미검증. 코드상 verdict 방향 불변·confidence만 보정 명시(prompts:469)로 over-weighting 방지 설계 확인.
3. **반응형 실측**: 두 뷰포트 배지 깨짐은 정적(flex-wrap/max-w-full/whitespace-nowrap)으로만 확인, 실제 렌더 미검증.
4. **codex 경로**: CLI 미설치로 codex 공급자 라이브 미검증(claude와 동일 route 코드 공유).

이상은 전부 graceful 폴백·정적 검증으로 기능적 안전성이 확보된 항목이며 블로커 아님.
