# QA — intraday-decision-overhaul PR-3a (judge 확신 점수화 + 결정론 컷·사이징 + 폴백 진입 금지)

- 대상: PR #315 `feature/intraday-conviction-judge` (01a6d1b) / PRD §3 PR-3a (AC-10~12)
- 판정: **전건 통과 (qa-passed)** — `npx vitest run` **1111 passed | 3 skipped**, `npx tsc --noEmit` 0 에러
- 스코프 확인: `git diff origin/main...HEAD` 에 `components/`·`lib/copy/stock/`·`lib/server/intraday/`·`hooks/`·`app/` 변경 **0건** (UI 무접촉 — AC-12 전제 충족)

## AC 별 결과

| AC | 재현 | 기대 | 실측 |
|---|---|---|---|
| AC-10 | `deriveActionFromConviction` 경계 테스트 (intradayCli.test.ts) | 65→BUY / 64→HOLD, 보유 중 40→SELL / 41→HOLD | ✅ 통과. env 오버라이드(`INTRADAY_BUY_CONVICTION_MIN=70` → 65 HOLD·70 BUY, 사이징 기준점 이동)·범위 밖 clamp(40→하한 50) 테스트 통과. constants.ts 실측: BUY_MIN 65(50~90)·SELL_MAX 40(10~50)·COOLDOWN 2(0~10), `.env.example` 3종 문서화 |
| AC-11 | intradayConviction.test.ts e2e (CLI 스텁, judge 빈 응답 ×2) | 신호 BUY+손익비 2.0+무경보+10:00 이어도 폴백 HOLD·매수 0 | ✅ 통과. `intraday.source=fallback`·action HOLD·`targetAllocations=[]`·사유 "AI 판단 응답 실패 — 신규 진입 금지(보유 관리만)". 스냅샷으로 rrr 2.0·신호 BUY 전제 재증명(게이트가 아닌 "실패 금지"가 원인) |
| AC-11 보호청산 | 보유 중+신호 SELL+judge 실패 | 보호 SELL 유지 | ✅ 통과 (intraday SELL → decision EXIT 전량) |
| AC-11 forced-exit | `git diff origin/main...HEAD -- intradayTickDecision.ts` | forcedExit 경로 불변 | ✅ forcedExit 블록 무변경(추가는 buildPreviousEcho export+convictionScore·ticksSinceLastExit 배선뿐). 폴백 HOLD 는 직전 목표/손절을 이월해 forced-exit 트리거 유지 |
| AC-11 코드 확인 | intradayCli.ts L816~828 | judge 실패 시 `deriveFromSignal(ctx, true)` 하드코딩 | ✅ noNewEntry=true 강제 → canBuy 구조적 false. 사전게이트 스킵 경로도 `signal.action==="HOLD"` 전제 → deriveFromSignal(BUY 필요)로 매수 불가 + 가드 주석 존재 |
| AC-12 | 소비처 grep + PR diff | 파생 action/confidence 로 ReadCard·Slack·틱 시트 무파괴 | ✅ `IntradayReadCard`(C.action[d.action]·C.confidence[d.confidence])·`slack.ts` 동일 패턴 — v2 는 결정론 파생(3-enum 보장), v1 은 기존 파싱(confidence 불량 시 MEDIUM), 폴백은 리터럴 → undefined 불가. 신규 payload 필드(convictionScore·judgeSchema)는 optional 추가라 구 틱 호환 |

## 안전핀 회귀 — v2 확신 90 파생 BUY 에도 전수 발화 (ad-hoc vitest 8건 실행, 전부 통과 후 파일 삭제)

| 안전핀 | 기존 테스트 | v2 파생 BUY 실측(ad-hoc) |
|---|---|---|
| critical 시장경보(정리매매·투자위험) | ✅ 유지 (AC-1·2·4·6 테스트 잔존) | ✅ HOLD 강등 + 커밋 테스트에도 v2 케이스 추가됨 |
| 일봉 레짐 −1 veto | ✅ 유지 | ✅ HOLD 강등 |
| 15:00+/일일손실(noNewEntry) | ✅ 유지 | ✅ HOLD 강등 |
| RRR<1.5 (1.2 + 레벨 전무 null 양쪽) | ✅ 유지(1.1) | ✅ 양쪽 HOLD 강등 |
| +5% 목표 캡 | ✅ 유지 | ✅ BUY 유지·목표 10,500 캡 + 커밋 테스트에 v2 케이스 추가됨 |
| maxPositionPct 캡 | ✅ toPaperTradingDecision 기존 테스트 유지 | ✅ e2e: 80점 사이징 50% = maxPositionPct 50 내 |

## 사이징·쿨다운 수치

- 사이징 `clamp(20+(c−65)×2, 20, 80)`: 65→20% / 80→50% / 95→80% / 100→80% 캡 / 컷 미만→20% 바닥 — 테스트 통과. ad-hoc 90→70% 확인
- 신뢰도 파생 `|Δ50|`: ≥25 HIGH(75·25) / ≥10 MEDIUM(60·40) / 그 외 LOW(55·50) — 테스트 통과
- 쿨다운: 청산 직후 0틱·1틱 → BUY 차단(사유 "재진입 쿨다운 — 청산 후 2틱 대기", generic "장 막판" 문구와 구분 확인), 정확히 2틱 → BUY 허용(5분 주기 기준 10분), null(이력 없음) → 미적용, **env 0 → 비활성(ad-hoc e2e 확인)**
- 구조 이벤트 LLM 관통 경로: `evaluatePreGate` structureEvent 분기가 `!noNewEntry`(쿨다운 합산) 전제 — 쿨다운 중 우회 불가(커밋 테스트 존재) + LLM 호출돼도 applyPostGate 4번째 인자로 강등

## 프롬프트 검수 (JUDGE_SYSTEM 재작성)

- HOLD 편향 문구 제거 확인: "데이터가 모호하거나 박스권 횡보면 HOLD 가 정답"·"손익비 1.5 미만이면 HOLD"·"15:00 이후 신규 진입 금지" 등 diff 삭제줄 확인 — 전부 서버 결정론 게이트로 이관(테스트로 커버)
- "50 고정 금지, 전 대역(0~100)을 사용하세요" 존재 ✅ / 고정 2~5% 목표 문구 제거("구조가 주는 여력만큼만"으로 상대화) ✅ / "(ATR 추정)" 레벨 소스 표기 ✅ / [직전 틱 내 결정] "확신 N점" 에코 ✅
- v2 JSON 스키마 ↔ `fromConvictionSchema` 필드 오탈자 대조: convictionScore·targetPrice·stopPrice·invalidationPrice·expectedHoldingMinutes·rationale·riskNotes **정확 일치**, v1 잔재(action/confidence/entryZone/entryPositionPct/sellRatioPct) 예시에 없음 ✅
- 참고: FLOW_ANALYST_SYSTEM 의 "모호하면 관망"·"2~5% 차익 구조" 문구는 잔존 — 분석가(서사)는 점수 미산출이라 컷에 무영향, PRD PR-3a 범위(judge) 밖 (무이슈)

## 기존 테스트 약화 검사

- `git diff origin/main...HEAD -- '**/__tests__/**'` 삭제 assertion **1건뿐**: 폴백 사유 문구 "지표 계산으로 대신 결정" → "신규 진입 금지(보유 관리만)" — AC-11 스펙 변경(오히려 강화), 약화 아님
- v1 마커 assertion(judgeSchema:"v1"·convictionScore 50 합성)은 순수 추가. 안전핀 테스트 삭제 0건. `__live__` 진단 하네스 변경은 skip 게이트 하네스(PR-1b evaluate 훅) — 회귀 무관

## 에지 케이스

- 쓰레기 judge 응답(문자열·빈 객체·미정의 action·`convictionScore:"높음"`) → normalizeLlm null → AC-11 폴백 경로 — 테스트 통과
- 범위 밖 점수(140) → 0~100 clamp 후 파생(BUY·80% 캡) — 테스트 통과
- conviction 에코 라운드트립(58점 HOLD → payload → buildPreviousEcho 58점)·구 틱(미기록 → null 에코) — 테스트 통과
- PR-1b 후속: `LIMITED_DATA_CONFIDENCE_CAP` export 공유(리터럴 0.6 복제 제거)·RULE_LABEL 4종(VOLUME_Z_UP/DOWN·VWAP_ABOVE/BELOW) 추가 확인

## 비고

- 라운드트립(BE LIVE): 본 PR 은 서버 판단 파이프라인 전용(UI·BFF 라우트 무변경)이라 브라우저 라운드트립 비대상. 실 LLM 점수 분포·컷 캘리브레이션은 PRD 계획대로 PR-4 장중 실검증에서 수행
- 로컬 main ref 가 stale(#312~#316 미반영) — diff·검증은 `origin/main...HEAD` 기준. origin/main #316 과 겹치는 파일은 `lib/types/paperTrading/paperTrading.ts` 1건(양쪽 additive)이며 `git merge-tree --write-tree origin/main HEAD` 드라이런 **충돌 0** 확인
