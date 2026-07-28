/**
 * 가격 레벨 컨텍스트 → 프롬프트 문구.
 *
 * 매물대는 **위/아래 배치**가 핵심이라 "지지 후보 / 저항"으로 나눠 쓴다:
 *  - 현재가 아래 매물대 = 아직 도달하지 않은 지지 후보 → 그 자리까지 **추가 하락 여지**.
 *  - 현재가에 도달한 매물대 = 과거 매수 평단 밀집 → 지지 시도 구간.
 *  - 현재가 위 매물대 = 반등 시 저항 → 돌파하면 추세 전환 트리거.
 * 이 해석 규칙까지 함께 넣어야 모델이 배치를 근거로 말할 수 있다.
 */

import type { PriceLevels, VolumeZone } from "@/lib/signal/levels/priceLevels";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function zoneText(z: VolumeZone): string {
  return `${won(z.price)}(현재가 대비 ${pct(z.distPct)}, 비중 ${z.weightPct.toFixed(1)}%)`;
}

/**
 * 레벨 블록 문자열. 값이 하나도 없으면 빈 문자열(프롬프트 무회귀).
 * @param levels computePriceLevels 결과.
 * @param current 현재가(원).
 */
export function formatPriceLevelsForPrompt(levels: PriceLevels, current: number): string {
  const lines: string[] = [];

  // ── 이동평균·볼린저 실제 가격 ────────────────────────────────────────────────
  const { ma5, ma20, ma60, ma120 } = levels.ma;
  const maParts = [
    ma5 !== null ? `5일 ${won(ma5)}` : null,
    ma20 !== null ? `20일 ${won(ma20)}` : null,
    ma60 !== null ? `60일 ${won(ma60)}` : null,
    ma120 !== null ? `120일 ${won(ma120)}` : null,
  ].filter(Boolean);
  if (maParts.length) lines.push(`이동평균: ${maParts.join(" | ")}`);

  if (levels.bollinger) {
    const b = levels.bollinger;
    lines.push(
      `볼린저(20,2): 상단 ${won(b.upper)} | 중심 ${won(b.mid)} | 하단 ${won(b.lower)}` +
        ` — 현재가는 하단 대비 ${pct(((current - b.lower) / b.lower) * 100)}`,
    );
  }

  // ── 피보나치 되돌림 ──────────────────────────────────────────────────────────
  if (levels.fib) {
    const f = levels.fib;
    lines.push(
      `직전 상승 파동: ${won(f.waveLow)}(${f.waveLowDate}) → ${won(f.waveHigh)}(${f.waveHighDate})` +
        ` — 현재 되돌림 ${(f.retracedRatio * 100).toFixed(0)}%`,
    );
    lines.push(
      `피보나치 되돌림: ${f.levels.map((l) => `${l.ratio} ${won(l.price)}`).join(" | ")}` +
        ` (0.5~0.618 은 되돌림이 가장 자주 멈추는 구간)`,
    );
  }

  // ── 매물대 배치 ──────────────────────────────────────────────────────────────
  if (levels.zones.length > 0) {
    const at = levels.zones.filter((z) => z.side === "at");
    const below = levels.zones.filter((z) => z.side === "below").sort((a, b) => b.price - a.price);
    const above = levels.zones.filter((z) => z.side === "above").sort((a, b) => a.price - b.price);

    lines.push("");
    lines.push("매물대(최근 1년 거래량 가격분포, 비중 3% 이상):");
    if (at.length) lines.push(`  · 현재가 도달: ${at.map(zoneText).join(" / ")}`);
    lines.push(
      `  · 현재가 아래(지지 후보): ${below.length ? below.slice(0, 3).map(zoneText).join(" / ") : "없음 — 아래에 받쳐줄 매물대가 없어 하락 시 공백"}`,
    );
    lines.push(
      `  · 현재가 위(저항): ${above.length ? above.slice(0, 3).map(zoneText).join(" / ") : "없음"}`,
    );
    lines.push(
      "  해석 규칙: 현재가가 매물대를 이미 깨고 내려왔다면 **그 아래 첫 매물대까지 추가 하락 여지**가 있고," +
        " 현재가가 매물대에 도달·근접했다면 과거 매수 평단이 몰린 **지지 시도 구간**이다." +
        " 위쪽 매물대는 반등 시 저항이며, 거래량 동반 돌파는 추세 전환 신호로 본다." +
        " 이 배치를 reasoning 에 근거로 쓰되, 지지/저항의 성립을 단정하지 말고 조건부로 서술하라.",
    );
  }

  if (lines.length === 0) return "";
  return ["[가격 레벨 — 실측값(추정 금지)]", ...lines].join("\n");
}
