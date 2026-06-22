/**
 * 자가교정 피드백(scorecard-feedback) — 캘리브레이션 산출 + PM 프롬프트 성적 요약 빌더(순수 함수).
 *
 * PRD `scorecard-feedback`.
 * - (가) `calibrateConfidence` / `calibrateAllConfidences` — confidence 버킷별 실측 적중률·표본수.
 *   표시 전용(모델 판정 불변). n<MIN_SAMPLE_N 이면 sufficient=false("표본 부족").
 * - (나) `buildScorecardFeedbackSummary` — PM 분석 프롬프트 주입용 성적 요약 문자열.
 *   n≥MIN_SAMPLE_N 버킷만 포함, 표본 없으면 **빈 문자열**(주입 skip → 무회귀).
 *
 * 입력은 모두 `summarizeScorecard` 가 만든 집계 셀(`ScorecardSummaryCell[]`)이다.
 * 채점 로직(phase-1)·집계 로직은 재활용만 하고 변경하지 않는다.
 */

import type {
  ConfidenceCalibration,
  ScorecardConfidence,
  ScorecardSummaryCell,
} from "@/lib/types/scorecard/scorecard";
import { MIN_SAMPLE_N } from "@/lib/server/scorecard/constants";

/** confidence 버킷 표시 순서(고정) — 강→약. */
export const CONFIDENCE_BUCKETS: ScorecardConfidence[] = ["HIGH", "MEDIUM", "LOW"];

/**
 * 한 confidence 버킷의 실측 보정값을 산출한다.
 *
 * confidence 차원 집계 셀은 horizon(d1/w1/m1) 별로 분리돼 있어, 같은 confidence 의 전 horizon
 * hit/miss 를 합산한다(표본 규모 극대화 — 표시 1줄 요약 목적).
 * - hitRate = hit/(hit+miss)(flat 분모 제외, phase-1 D3 정합). 분모 0 이면 null.
 * - sufficient = (hit+miss) >= minSampleN.
 */
export function calibrateConfidence(
  cells: ScorecardSummaryCell[],
  confidence: ScorecardConfidence,
  minSampleN: number = MIN_SAMPLE_N,
): ConfidenceCalibration {
  let hit = 0;
  let miss = 0;
  for (const c of cells) {
    if (c.dimension !== "confidence") continue;
    if (c.key !== confidence) continue;
    hit += c.hit;
    miss += c.miss;
  }
  const sample = hit + miss;
  return {
    confidence,
    hit,
    miss,
    sample,
    hitRate: sample > 0 ? hit / sample : null,
    sufficient: sample >= minSampleN,
  };
}

/**
 * HIGH/MEDIUM/LOW 전 버킷 보정값 — 표본(hit+miss)이 1건 이상인 버킷만 반환.
 * 표본 0 버킷은 표시할 게 없어 제외(빈 배열이면 화면에서 캘리브레이션 줄 자체를 숨김).
 */
export function calibrateAllConfidences(
  cells: ScorecardSummaryCell[],
  minSampleN: number = MIN_SAMPLE_N,
): ConfidenceCalibration[] {
  return CONFIDENCE_BUCKETS.map((b) => calibrateConfidence(cells, b, minSampleN)).filter(
    (c) => c.sample > 0,
  );
}

/**
 * PM 분석 프롬프트 주입용 "과거 판정 성적" 요약 문자열 빌더 — (나).
 *
 * - 전체(confidence 합산) + verdict 별 실측 적중률·표본수를 한 블록으로 요약.
 * - **n≥minSampleN 버킷만 포함**. 포함할 라인이 하나도 없으면 **빈 문자열**(주입 skip).
 * - 모델이 자기조정하도록 가이드 문구를 덧붙인다(과신·앵커링 금지). 우리는 데이터만 주입한다.
 *
 * 빈 문자열 반환 = 호출부에서 프롬프트에 아무것도 덧붙이지 않음 → 완전 무회귀.
 */
export function buildScorecardFeedbackSummary(
  cells: ScorecardSummaryCell[],
  minSampleN: number = MIN_SAMPLE_N,
): string {
  const fmtPct = (rate: number | null): string =>
    rate === null ? "N/A" : `${Math.round(rate * 100)}%`;

  const lines: string[] = [];

  // 1) 전체(confidence 합산) — 충분 표본 버킷의 hit/miss 를 모두 합쳐 1줄.
  const allBuckets = CONFIDENCE_BUCKETS.map((b) => calibrateConfidence(cells, b, minSampleN));
  const sufficient = allBuckets.filter((c) => c.sufficient);
  if (sufficient.length > 0) {
    const totHit = sufficient.reduce((s, c) => s + c.hit, 0);
    const totMiss = sufficient.reduce((s, c) => s + c.miss, 0);
    const totN = totHit + totMiss;
    if (totN > 0) {
      lines.push(`- 전체: 실측 적중률 ${fmtPct(totHit / totN)} (n=${totN})`);
    }
  }

  // 2) confidence 버킷별(충분 표본만).
  const CONF_KO: Record<ScorecardConfidence, string> = {
    HIGH: "높음",
    MEDIUM: "보통",
    LOW: "낮음",
  };
  for (const c of allBuckets) {
    if (!c.sufficient) continue;
    lines.push(
      `- confidence ${CONF_KO[c.confidence]}(${c.confidence}): 실측 적중률 ${fmtPct(c.hitRate)} (n=${c.sample})`,
    );
  }

  // 3) verdict 별(충분 표본만) — 전 horizon 합산.
  const verdictAgg = new Map<string, { hit: number; miss: number }>();
  for (const cell of cells) {
    if (cell.dimension !== "verdict") continue;
    const cur = verdictAgg.get(cell.key) ?? { hit: 0, miss: 0 };
    cur.hit += cell.hit;
    cur.miss += cell.miss;
    verdictAgg.set(cell.key, cur);
  }
  for (const [verdict, agg] of verdictAgg) {
    const n = agg.hit + agg.miss;
    if (n < minSampleN) continue;
    lines.push(`- verdict ${verdict}: 실측 적중률 ${fmtPct(agg.hit / n)} (n=${n})`);
  }

  // 충분 표본 라인이 하나도 없으면 주입 skip(빈 문자열) — 무회귀.
  if (lines.length === 0) return "";

  return `\n\n[너의 과거 판정 성적 — 실측 채점 데이터]
아래는 이 시스템의 과거 AI 판정이 결정시점 대비 실제로 적중했는지 채점한 누적 통계다(표본 n=${minSampleN} 이상 버킷만).
${lines.join("\n")}

위 성적 활용 원칙 (Portfolio Manager 전용):
1) 자기교정 — 과거 confidence 가 높았는데 실측 적중률이 낮았다면 이번 판정에서 과신하지 말고 confidence 를 보수적으로 조정하라.
2) 재검증 우선 — 이 성적은 보조 참고일 뿐이다. 이번 분석가 데이터(기술·뉴스·펀더멘털·심리)와 토론·리스크 평가로 독립적으로 재검증하라.
3) 앵커링 금지 — 특정 verdict 의 과거 적중률이 좋다고 그 verdict 로 끌려가지 마라. 데이터가 가리키는 방향을 1차 근거로 삼아라.`;
}
