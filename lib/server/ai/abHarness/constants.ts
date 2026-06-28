/**
 * A/B 하니스 무회귀 판정 임계값.
 * 표본이 작으므로(repeats 2~3) 통계 검정 대신 결정론 프록시 기반 게이트.
 */

/** 공통 ticker 중 verdict 일치율이 이 값 이상이면 방향 무회귀로 본다. */
export const AB_VERDICT_AGREEMENT_MIN = 0.8;

/** 목표가(target_pct) 공통 ticker 평균 |Δ| 허용 밴드(%포인트). */
export const AB_TARGET_DRIFT_MAX = 3;

/** 손절(stop_loss_pct) 공통 ticker 평균 |Δ| 허용 밴드(%포인트). */
export const AB_STOP_DRIFT_MAX = 3;

/** 품질 판정에 필요한 최소 공통 ticker 수. 미만이면 PASS/REVIEW 대신 "표본 부족". */
export const AB_MIN_COMMON_TICKERS = 3;

/** HIGH confidence 비율이 baseline 대비 이만큼 이상 하락하면 REVIEW 플래그. */
export const AB_CONFIDENCE_DROP_MAX = 0.2;
