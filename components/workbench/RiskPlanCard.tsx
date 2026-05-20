/**
 * risk_plan 카드 — 표 + CSS 가격 막대.
 *
 * DESIGN.md OPEN QUESTION #5 결정 그대로:
 *   - 표 (진입가/손절가/익절가/제안 수량·금액/RR)
 *   - 가로 가격 막대 `price-bar-track` + `price-bar-stop`(critical) · `price-bar-entry`(info) · `price-bar-target`(tertiary)
 *   - feasibility 비현실인 경우 표 위에 "비현실 목표 기준 계산값 — 참고로만 보세요" 한 줄
 *   - 차트 라이브러리 미도입 (PRD §4)
 */

import type { RiskPlan } from "@/lib/types/workbench";
import { formatMoney, formatNumber } from "@/lib/formatters/money";

type Props = {
  riskPlan: RiskPlan;
  currency?: string;
  isUnrealistic?: boolean;
};

export function RiskPlanCard({ riskPlan, currency, isUnrealistic }: Props) {
  const {
    entry_price,
    stop_loss_price_for_day,
    take_profit_price_for_day,
    suggested_buy_amount,
    suggested_share_qty,
    expected_loss_if_stopped,
    expected_gain_if_take_profit,
    risk_reward_ratio,
  } = riskPlan;

  // 가격 막대: stop ~ target 구간을 0~100% 로 매핑.
  const lo = Math.min(stop_loss_price_for_day, entry_price, take_profit_price_for_day);
  const hi = Math.max(stop_loss_price_for_day, entry_price, take_profit_price_for_day);
  const range = Math.max(hi - lo, 0.0001);
  const stopPct = ((stop_loss_price_for_day - lo) / range) * 100;
  const entryPct = ((entry_price - lo) / range) * 100;
  const targetPct = ((take_profit_price_for_day - lo) / range) * 100;

  return (
    <article className="card" aria-label="리스크 플랜">
      <p className="mb-sm text-h2 text-primary">리스크 플랜</p>
      {isUnrealistic ? (
        <p className="mb-sm text-body-sm text-warn">
          비현실 목표 기준 계산값 — 참고로만 보세요.
        </p>
      ) : null}

      <div
        className="relative my-lg h-[18px]"
        role="img"
        aria-label={`손절 ${formatNumber(stop_loss_price_for_day)} · 진입 ${formatNumber(
          entry_price,
        )} · 익절 ${formatNumber(take_profit_price_for_day)}`}
      >
        <div className="price-bar-track" />
        <div className="price-bar-stop" style={{ left: `${stopPct}%` }} />
        <div className="price-bar-entry" style={{ left: `${entryPct}%` }} />
        <div className="price-bar-target" style={{ left: `${targetPct}%` }} />
      </div>
      <div className="flex gap-md flex-wrap mt-sm text-caption text-secondary">
        <span className="inline-flex items-center gap-xs before:content-[''] before:inline-block before:w-[8px] before:h-[8px] before:rounded-pill before:bg-critical">
          손절
        </span>
        <span className="inline-flex items-center gap-xs before:content-[''] before:inline-block before:w-[8px] before:h-[8px] before:rounded-pill before:bg-info">
          진입
        </span>
        <span className="inline-flex items-center gap-xs before:content-[''] before:inline-block before:w-[8px] before:h-[8px] before:rounded-pill before:bg-tertiary">
          익절
        </span>
      </div>

      <table className="w-full mt-sm border-collapse">
        <tbody>
          <tr>
            <th
              scope="row"
              className="py-sm text-left text-body-sm text-secondary border-b border-line"
            >
              진입가
            </th>
            <td className="py-sm text-right text-mono-numeric tabular text-primary border-b border-line">
              {formatMoney(entry_price, currency)}
            </td>
          </tr>
          <tr>
            <th
              scope="row"
              className="py-sm text-left text-body-sm text-secondary border-b border-line"
            >
              손절가
            </th>
            <td className="py-sm text-right text-mono-numeric tabular text-primary border-b border-line">
              {formatMoney(stop_loss_price_for_day, currency)}
            </td>
          </tr>
          <tr>
            <th
              scope="row"
              className="py-sm text-left text-body-sm text-secondary border-b border-line"
            >
              익절가
            </th>
            <td className="py-sm text-right text-mono-numeric tabular text-primary border-b border-line">
              {formatMoney(take_profit_price_for_day, currency)}
            </td>
          </tr>
          <tr>
            <th
              scope="row"
              className="py-sm text-left text-body-sm text-secondary border-b border-line"
            >
              제안 매수 금액
            </th>
            <td className="py-sm text-right text-mono-numeric tabular text-primary border-b border-line">
              {formatMoney(suggested_buy_amount, currency)}
            </td>
          </tr>
          <tr>
            <th
              scope="row"
              className="py-sm text-left text-body-sm text-secondary border-b border-line"
            >
              제안 수량
            </th>
            <td className="py-sm text-right text-mono-numeric tabular text-primary border-b border-line">
              {formatNumber(suggested_share_qty, { digits: 4 })}
            </td>
          </tr>
          <tr>
            <th
              scope="row"
              className="py-sm text-left text-body-sm text-secondary border-b border-line"
            >
              손절 시 예상 손실
            </th>
            <td className="py-sm text-right text-mono-numeric tabular text-primary border-b border-line">
              {formatMoney(expected_loss_if_stopped, currency)}
            </td>
          </tr>
          <tr>
            <th
              scope="row"
              className="py-sm text-left text-body-sm text-secondary"
            >
              익절 시 예상 이익
            </th>
            <td className="py-sm text-right text-mono-numeric tabular text-primary">
              {formatMoney(expected_gain_if_take_profit, currency)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-sm text-body-sm text-body-strong">
        손익비{" "}
        <strong className="tabular">
          {formatNumber(risk_reward_ratio, { digits: 2 })} : 1
        </strong>
      </p>
    </article>
  );
}
