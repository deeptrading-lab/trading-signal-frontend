# 단타 판단 일일 캘리브레이션 (intraday-decision-overhaul PR-4)

AI 단타(cli-agent) 판단의 `convictionScore`가 실제 방향 예측력을 갖는지 —
**conviction 버킷 승률이 25% 베이스라인을 이기는가** — 를 매일 장 마감 후 관측·누적하는 도구.
읽기 전용(트레이딩 루프 무접촉). 라벨 규칙은 `lib/server/intraday/tickLabels.ts`(PR-2)를 그대로 재사용한다.

## 사용법

```bash
# repo 루트에서, 장 마감(15:40) 이후 저녁에
npx tsx scripts/intraday/daily.mts               # 오늘(KST) 자동
npx tsx scripts/intraday/daily.mts 2026-07-13    # 특정일(당일·최근 며칠만)
# provider 비교가 필요할 때만 명시 필터(기본은 전체 provider 포함)
INTRADAY_DAILY_PROVIDER=codex npx tsx scripts/intraday/daily.mts 2026-07-13
```

## 전제

1. **장중(09:00~15:30)에 dev 서버가 켜져 있어야** 네 세션이 틱돼서 데이터가 쌓인다. 이 스크립트는 쌓인 걸 읽기만 한다(서버 불필요).
2. **15:40(자동 종료) 이후** 실행 — 세션이 completed 이고 KIS 당일 분봉이 조회된다.
3. **반드시 당일 저녁에** 실행 — KIS 과거 분봉은 최근 며칠만 제공한다. 일주일 뒤 몰아서 라벨링하면 UNRESOLVED 만 남는다.
4. `.env.local` 에 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` + KIS 키가 있어야 한다.
5. provider는 기본 제외하지 않는다. provider별 비교는 `INTRADAY_DAILY_PROVIDER`로 명시한다.

## 출력 (`output/`, gitignore — 로컬 누적)

- `report-<date>.txt` — 그날 전체 리포트(파이프라인·버킷 승률·상관).
- `today-{sessions,ticks}-<date>.json` — 그날 원본(사후 재분석·여러 날 풀링용).
- `daily-log.tsv` — **하루 한 줄 누적**(같은 날 재실행 시 그 줄 교체). 여러 날 추세를 한 눈에.

### `daily-log.tsv` 컬럼

| 컬럼 | 뜻 |
|---|---|
| `HOLD%` | HOLD 판단 비율(원 감사 99.8% 대비) |
| `v2` / `convMean` | conviction 점수화된 틱 수 / 평균 |
| `grandWR` | 전체 반사실 승률 W/(W+L) — **25% 베이스라인 대응** |
| `>=65WR` / `>=65(W/L)` | conviction≥65(BUY 발화) 버킷 승률 — **PR-4 판정 대상** |
| `convSpear` / `sigSpear` | conviction·signalScore vs +30분 forward return Spearman(음/0 = 방향 예측력 없음/역) |
| `regime(-/0/+)` | v2 틱의 일봉 레짐 분포(약세/중립/강세). **여러 날 계속 `0/all/0`(전부 중립)이면 일봉 레짐 veto 무력화 신호** — `intradayTickDecision.ts` 가 매 틱 KIS 일봉 페치, 실패 시 0 폴백 → 20세션 동시 rate-limit 의심. |
| `movers` / `movBought` / `movMaxConv` | 일중 변동폭 ≥10% 종목 수 / 그중 매수한 수 / 그 종목 최대 conviction 평균. **movMaxConv 가 컷(65) 밑에 계속 걸리면 "추세돌파 못 탐"(급등주에서 확신 못 함) 정량 확인.** |
| `failKinds` | agentDiagnostics CLI 실패 종류(empty/parse/timeout/abort/error) |

## 판정 기준 (구조적 vs 하락일 특이)

- `>=65WR`이 `grandWR`·25% **아래로 유지** + `convSpear`가 계속 **음/0** → conviction 역상관 **구조적** 재확인 → 컷 튜닝 아닌 **신호/판단 로직 재설계** 신호.
- 어느 날 `>=65WR`이 33%+ 로 튀거나 `convSpear`가 뚜렷이 **양(+)**(특히 상승일) → "하락장 페이드" 성격으로 재해석.
- `>=65(W/L)` 표본은 하루 ~20틱뿐 → 며칠 합쳐야 유의미(binomial). `output/today-ticks-*.json` 을 풀링해 다일 상관을 다시 낼 수 있다.
- `⚠️ 미지정 세션` 경고가 뜨면 owner 게이트(#326) 확인 — 두 로컬이 같은 세션을 이중 틱하면 데이터 오염.

## 베이스라인

**2026-07-10(첫 클린 런) = [BASELINE-2026-07-10.md](./BASELINE-2026-07-10.md)** 참조.
요약: conviction≥65 승률 10%(최악·역상관), 전체 방향 예측력 ≈0, signalScore 도 동일 역전(신호 레이어 문제),
상승추세 종목에서도 역전 지속(구조적 쪽). 단 1 클린일·표본 작아 다음 주 누적으로 확정 필요.
