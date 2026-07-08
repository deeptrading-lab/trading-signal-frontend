# QA — intraday-decision-overhaul PR-1b (graded 축 + axisOverrides seam)

- 대상: PR #311 (`feature/intraday-graded-axes`, 96299a3) · PRD `docs/prd/intraday-decision-overhaul.md` §3 PR-1b
- 판정: **qa-passed** · 실패 0건
- 참고: 본 브랜치는 PR-0a(#309) 이전 main 기반이라 통합 리포트(`intraday-decision-overhaul.md`) 부재 → 본 파일로 신설, 머지 후 통합 예정.

## 공통 AC

| 항목 | 명령 | 실측 |
|---|---|---|
| 테스트 | `npx vitest run` | **1068 passed** \| 3 skipped (128 파일) — PASS |
| 타입 | `npx tsc --noEmit` | exit 0 — PASS |
| 린트/빌드 | `npm run lint` · `npx next build --webpack` | 린트 0 / 빌드 성공(exit 0) — PASS. Turbopack 빌드는 워크트리 심볼릭 node_modules 거부(기지 환경 제약, 코드 무관)로 webpack 대체 |
| BFF·한글 톤·접근성 | 변경 범위 = `lib/signal`·`lib/server` 순수 로직 (UI·route handler 무접촉) | 무회귀 — N/A |

## AC-7 — 일봉 경로 opts 미지정 비트 동일 무회귀

| 재현 | 기대 | 실측 |
|---|---|---|
| `npx vitest run lib/signal/__tests__/intradayAxes.test.ts lib/signal/__tests__/intradayProfile.test.ts` | 전부 통과 | **22 passed** — PASS |
| `intradayAxes.test.ts` "미지정 === axisOverrides undefined === 빈 객체" | deep-equal 동일 | PASS (override 지정 시 가중치 0.2×Δ 정밀 이동 테스트로 seam 실동작도 검증) |
| 기존 `intradayProfile.test.ts:19` "opts 미지정 === 빈 opts" | 비트 동일 | PASS (무수정 유지) |
| `git grep evaluateSignal` (lib/signal 밖) | axisOverrides 전달 0건 | `app/api/stock/ai-analysis/route.ts:736` `evaluateSignal(sorted)`·`hooks/stock/useSignalResult.ts:43` `evaluateSignal(sorted)` — 둘 다 opts 무전달. axisOverrides 참조는 lib/signal·lib/types·문서뿐 — PASS |
| `backtest evaluate 훅` 미지정 무회귀 | 기존 경로와 trades/metrics 동일 | 테스트 2건 PASS (미지정=동일·지정 시 look-ahead 차단 슬라이스 전달 확인) |

## AC-8 — graded 축 분산 >0 + 오프라인 A/B (픽스처 12종목, 2026-07-09 실행)

재현: `RUN_INTRADAY_DIAG=1 INTRADAY_TICKERS="000660,...,329180" npx vitest run lib/signal/backtest/__live__/intradayDiagnostic.test.ts` (픽스처 12/12 로드)

축 분산 (5분봉, n=1,824 슬라이스):

| 축 | legacy | graded | 판정 |
|---|---|---|---|
| volume | sd 21.3 · 비중립 18% | sd 15.1 · **비중립 44%** | 비중립 2.4배 — PASS |
| volatility | sd 4.7 · 비중립 12% | sd 27.6 · **비중립 95%** | 기준(≥90%) 충족 — PASS |
| 동의도 | 평균 0.52 · 0.5박제 **70%** | 평균 0.35 · 0.5박제 **5%** | 기준(≤10%) 충족 — PASS |

거래 리포트 (net c0.4, legacy trig ↔ graded trig / everyBar, PF 허용 ±0.15):

| TF | legacy trig PF(표본) | graded trig PF(표본) | Δ | everyBar legacy→graded | 판정 |
|---|---|---|---|---|---|
| 3분 | 0.48 (1403) | 0.51 (1377) | +0.03 | 0.52 (8052) → 0.51 (10254) | PASS |
| 5분 | 0.58 (950) | 0.57 (929) | −0.01 | 0.66 (5350) → 0.63 (6619) | PASS |
| 15분 | 0.86 (394) | 0.98 (388) | +0.12 | 1.00 (1956) → 1.00 (2368) | PASS |

- 전 TF 표본 >0·PF Δ ≤0.15 — 붕괴 없음. graded 는 판단 다양화 목적(엣지 개선은 PR-2 이후 과제)이며 15분 trig 는 오히려 +0.12.

## 에지 점검 (코드 리딩)

- (a) 자기오염 없음: `gradedVolumeAxis` 베이스라인 = `slice(n-1-40, n-1)` — 마지막 봉 제외, z·ratio 모두 window 만 사용 — OK.
- (b) VWAP 당일 한정: `date.slice(0,10)` prefix 필터. KIS `formatMinuteStamp`·토스 `isoToKstMinuteStamp`·리샘플 버킷키 모두 `YYYY-MM-DDTHH:mm` 통일 확인 — 교차일 오염 불가 — OK.
- (c) graded 동의도는 `if (result.warmupOk)` 안에서만 적용, limitedData 0.6 상한 재적용 — 워밍업 미달 시 레거시 confidence 유지 — OK.
- (d) 레거시 키 보존: ratio≥`VOLUME_SURGE_MULT`(1.5) 시에만 `VOLUME_SURGE_*`, 미달은 `VOLUME_Z_*`(트리거셋 `STRONG_*_TRIGGERS` 미포함 확인 → 트리거 모드에 신규 진입 미발생). z≤0 이면 산술평균상 ratio<1 이라 임계 충돌 없음. 관찰: ratio 베이스라인이 legacy 20봉 volMA 와 달리 40봉 산술평균(마지막 봉 제외) — 발화 경계가 미세하게 다를 수 있으나 A/B 표본(1403→1377)상 영향 경미. std≤1e-9 균질창은 null → 레거시 축 fail-soft — OK.
- (e) `INTRADAY_PRIOR_DAYS`: `envInt` clamp 1~5·비정상 fallback 3 확인. 소비처 `getMinuteCandles` 루프 상한 `PRIOR_DAYS*2+10`(기본 16, 최대 20) 역일 프로브 + `priorMinuteCache` ticker|tf|일자 캐시 — 콜드캐시 첫 페치만 일수 비례 증가(상수 주석에 KIS 30봉/콜 경고·toss 병행 권장 명시), 무한루프 없음 — OK.

## 비고

- `engine.ts` seam 은 `axisOverrides` 존재 시에만 map — 빈 객체도 참조 동일 원소의 새 배열이라 deep-equal 동일(테스트로 고정).
- 라이브 유일 소비처 `lib/server/paperTrading/decisionProviders/intradayCli.ts:520` 은 `evaluateIntradaySignal` 경유 — graded 배선 자동 적용. 장중 before/after 스냅샷 검증은 PRD 대로 후속(평일 장중).
