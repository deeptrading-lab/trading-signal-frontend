# QA — intraday-decision-overhaul PR-3b (preGate 교차 이벤트 트리거 확장)

- 대상: PR #318 `feature/intraday-pregate-triggers` (960fc7e) / PRD §3 PR-3b (AC-13)
- 판정: **전건 통과 (qa-passed)** — `npx vitest run` **1169 passed | 3 skipped**, `npx tsc --noEmit` 0 에러
- 스코프: `git diff origin/main...HEAD` 6파일 — 서버 판단 파이프라인 전용(UI·BFF·copy 무접촉), 라운드트립 비대상

## AC 별 결과

| AC | 재현 | 기대 | 실측 |
|---|---|---|---|
| AC-13 발화 | intradayFeatures.test.ts 교차 3종 발화 케이스 | 교차 봉에서 true + `[셋업 이벤트]` 프롬프트 라인 | ✅ vwapReclaim(90→112 VWAP 교차)·orBreakout(104→106>OR고가105)·volumeZSurge(z<2→2,200 z≈2.3) 전부 boolean 직접 assert + 포맷 라인 확인 |
| AC-13 체류 미발화 | 발화 직후 봉을 하나 더 붙인 케이스 3종 | false + `[셋업 이벤트]` 무주입 | ✅ 3종 전부 통과 — 상태 검사 아님(교차 1회) 확인. `formatIntradayFeatures` not.toContain 까지 검증 |
| AC-13 경계 | VWAP 동가(≤ 성립)·OR 형성 중·z 룩백 경계 | 동가→다음 봉 돌파 시 발화 / 형성 중 false / 직전 z null 이면 불성립 | ✅ 3종 전부 통과. orBreakout 동가는 strict `>` 라 미돌파(코드 확인) |
| 트리거 배선 | intradayCli.test.ts deriveStructureEvent 7케이스 | 단독 라벨·` · ` 결합·regime −1 null·피처 null | ✅ 전부 통과. 기존 "전고 돌파 진행" 라벨 유지 |

## 교차 판정쌍 정합 (코드 리딩)

- **vwapReclaim ✅** — `readVwapReclaim` 이 증분 VWAP 를 두 시점에서 각각 캡처(`i===len−2` prevVwap / `i===len−1` curVwap). 최종 VWAP 하나로 양쪽 비교하는 왜곡 없음. 판정쌍 = 마감봉(끝−2) vs 직전 마감봉, 진행 중 끝봉 제외(`slice(0,−1)`). vol 0 → null → false
- **orBreakout ✅** — 이번 마감봉이 09:30 이전이면 즉시 false(레인지 형성 중 보류, 테스트 존재). OR 고가 동가(==)는 `>` strict 라 돌파 아님·직전 봉 동가는 `<=` 라 pre-cross 성립(첫 돌파봉 발화). OR 봉 0개 → false
- **volumeZSurge ✅** — `volumeZAt(n−2)` vs `volumeZAt(n−3)`: z 창이 각 봉 기준 trailing 40봉(자기 제외)으로 1봉씩 밀림 — 같은 창 재사용 왜곡 없음. 직전 z null(룩백 경계·std≈0)이면 교차 불성립(보수적) — 테스트 존재

## volumeZAt 추출 비트 동일 검증

- diff 문자 대조: 가드(`idx<40` ⇔ 구 `n<41` @ idx=n−1)·창 slice·log1p/mean/variance/std·엡실론 가드(1e−9)·z 산식 전부 동일 텍스트 이동, 산식 변형 0. `gradedVolumeAxis` 는 위임만
- 회귀 앵커: 손검산 z≈1.198 테스트(`toBeCloseTo(1.198, 2)`) + hit weight/detail 문자열 대조 + null 가드 3종(룩백 미달·범위 밖·균질) — 전부 통과

## 안전 불변식

- **트리거 → callLlm만**: `structureEvent` 는 `evaluatePreGate`(L283, `!noNewEntry` 가드)와 스냅샷(L700)에서만 read — `deriveFromSignal`·`applyPostGate` 불관여(grep 확인). 폴백 HOLD 유지 테스트 통과
- **시장경보 게이트 불변**: 트리거로 LLM 이 BUY 내도 정리매매 경보 사후 게이트가 HOLD 강등(신규 테스트 통과). preGate 스킵 조건의 `signal.action==="HOLD"` 전제 + 경보 우회 방지 주석 유지
- **noNewEntry 가 pierce 차단**: 15:05 + 구조 이벤트 → 스킵 유지 / 재진입 쿨다운(3번째 인자) → callLlm false (기존 + PR-3b 신규 테스트 각 통과). dailyLossKill 은 동일 disjunction 1식이라 구조적 동등
- `evaluatePreGate` 본문 무변경(diff 0) — 트리거 확장은 `deriveStructureEvent` 파생부에서만

## LLM 콜 볼륨 추정 (참고)

- 감사 데이터 2,199틱 중 preGate 스킵 1,121틱(51.0%: "상황 변화 없음" 1,081 + "변화 없음" 40) — 신규 트리거의 관통 대상
- 틱 로그에 분봉 미보존(priceSnapshot=현재가 1건뿐)이라 교차 재계산 불가 → **정량 추정 불가**. 정성: 교차 시맨틱상 종목·일당 ORB ≤1~2회·VWAP 재탈환 수 회·z≥2 교차 수 회 수준 → 스킵틱의 극히 일부(개산 한 자릿수 %)만 관통 예상. **장중 실측 필요**(PR-4 캘리브레이션에서 스냅샷 structureEvent 필드로 계수 가능)

## 비고

- 기존 테스트 약화 0건 — `__tests__` diff 는 순수 추가(+194줄), 삭제 assertion 없음
- 라운드트립(BE LIVE)·뷰포트 검증: UI 무변경 PR 이라 비대상 (PR-3a 리포트와 동일 기준)
