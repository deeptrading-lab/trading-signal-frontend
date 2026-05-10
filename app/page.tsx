"use client";

import { useEffect, useMemo, useState } from "react";

type WhitelistEntry = {
  ticker: string;
  name: string;
  asset_type: string;
  risk_tier: string;
  aliases: string[];
};

type HorizonSummary = {
  label: string;
  return_pct: number;
  direction: string;
  max_drawdown_pct: number;
};

type Analysis = {
  whitelist_entry: WhitelistEntry;
  action: string;
  feasibility: string;
  annualized_target_return_pct: number;
  risk_plan: {
    suggested_buy_amount: number;
    suggested_share_qty: number;
    entry_price: number;
    take_profit_price_for_day: number;
    stop_loss_price_for_day: number;
    expected_loss_if_stopped: number;
    expected_gain_if_take_profit: number;
    risk_reward_ratio: number | null;
  };
  brief: {
    action: string;
    confidence: string;
    score: number;
    reference_price: number;
    data_quality: { source: string };
    reasons: string[];
    risks: string[];
  };
  horizons: HorizonSummary[];
  warnings: string[];
};

type Currency = "KRW" | "USD";

const USD_KRW = 1350;

const labels: Record<string, string> = {
  ACTIONABLE_BUY: "매수 검토 가능",
  CONDITIONAL_BUY: "조건부 매수",
  HOLD: "관망",
  PARTIAL_SELL: "일부 매도",
  SELL: "매도 검토",
  AVOID: "진입 회피",
  ACTIONABLE_LONG: "매수 검토 가능",
  CONDITIONAL_LONG: "조건부 매수",
  HOLD_MONITOR: "관망",
  REDUCE_RISK: "리스크 축소",
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  REALISTIC: "현실적",
  STRETCHED: "공격적",
  UNREALISTIC: "현실성 낮음",
  BULLISH: "상승 우위",
  NEUTRAL: "중립",
  BEARISH: "하락 우위",
};

const actionCopy: Record<string, string> = {
  ACTIONABLE_BUY: "지금 분할 매수를 검토할 수 있습니다.",
  CONDITIONAL_BUY: "추가 조건을 확인한 뒤 매수를 검토하세요.",
  HOLD: "지금은 새로 진입하기보다 관망이 우선입니다.",
  PARTIAL_SELL: "보유 중이라면 일부 익절 또는 비중 축소를 검토하세요.",
  SELL: "보유 중이라면 매도 검토가 필요한 구간입니다.",
  AVOID: "현재 조건에서는 신규 진입을 피하는 편이 낫습니다.",
};

const ko = (value: string) => labels[value] ?? value;
const pct = (value: number) => `${value.toFixed(2)}%`;
const krw = (value: number) =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);

export default function Home() {
  const [ticker, setTicker] = useState("AAPL");
  const [capitalKrw, setCapitalKrw] = useState(10_000_000);
  const [targetReturn, setTargetReturn] = useState(8);
  const [targetDays, setTargetDays] = useState(90);
  const [maxLoss, setMaxLoss] = useState(2);
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [suggestions, setSuggestions] = useState<WhitelistEntry[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [status, setStatus] = useState("AAPL, BTC 분석 가능");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/whitelist/search?q=${encodeURIComponent(ticker)}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload) => setSuggestions(payload.results ?? []))
      .catch(() => undefined);
    return () => controller.abort();
  }, [ticker]);

  const headline = useMemo(() => {
    if (!analysis) return "지금 살 만한지 빠르게 판단하세요";
    return `${analysis.whitelist_entry.name} ${analysis.whitelist_entry.ticker}`;
  }, [analysis]);

  async function runAnalysis() {
    setLoading(true);
    setError("");
    setStatus("분석 중");
    try {
      const response = await fetch("/api/workbench/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          capital_amount: capitalKrw / USD_KRW,
          target_return_pct: targetReturn,
          target_period_days: targetDays,
          max_loss_pct: maxLoss,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? payload.message ?? "분석에 실패했습니다");
      }
      setAnalysis(payload.analysis);
      setStatus("분석 완료");
      setSavedAt("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "분석에 실패했습니다");
      setStatus("분석 실패");
    } finally {
      setLoading(false);
    }
  }

  function savePlan() {
    if (!analysis) return;
    const saved = new Date().toISOString();
    localStorage.setItem(
      "trading-signal-engine:last-plan",
      JSON.stringify({
        saved_at: saved,
        input: {
          ticker,
          capital_krw: capitalKrw,
          target_return_pct: targetReturn,
          target_period_days: targetDays,
          max_loss_pct: maxLoss,
        },
        analysis,
      }),
    );
    setSavedAt(saved);
    setStatus("매수 계획 저장 완료");
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">AI 매매 판단 보조</p>
          <h1>TradingSignalEngine</h1>
        </div>
        <div className="status">{status}</div>
      </header>

      <section className="workspace">
        <aside className="control">
          <div className="controlHeader">
            <strong>분석 조건</strong>
            <CurrencyToggle currency={currency} setCurrency={setCurrency} />
          </div>

          <label htmlFor="ticker">종목</label>
          <input id="ticker" value={ticker} onChange={(event) => setTicker(event.target.value)} />

          <div className="suggestions">
            {suggestions.map((item) => (
              <button
                className="tickerButton"
                key={item.ticker}
                type="button"
                onClick={() => setTicker(item.ticker === "BTC-USD" ? "BTC" : item.ticker)}
              >
                <strong>{item.ticker}</strong>
                <span>{item.name}</span>
              </button>
            ))}
          </div>

          <label htmlFor="capital">투입 자본금 KRW</label>
          <input
            id="capital"
            min={1}
            type="number"
            value={capitalKrw}
            onChange={(event) => setCapitalKrw(Number(event.target.value))}
          />
          <p className="fieldHint">
            원화 기준으로 입력합니다. 현재 입력값 {krw(capitalKrw)} · 엔진 환산 약{" "}
            ${Math.round(capitalKrw / USD_KRW).toLocaleString()}
          </p>
          <QuickChips
            items={[
              ["₩100만", 1_000_000],
              ["₩300만", 3_000_000],
              ["₩500만", 5_000_000],
              ["₩1,000만", 10_000_000],
            ]}
            onPick={setCapitalKrw}
          />

          <label htmlFor="targetReturn">목표 수익률 %</label>
          <input
            id="targetReturn"
            min={0}
            step={0.1}
            type="number"
            value={targetReturn}
            onChange={(event) => setTargetReturn(Number(event.target.value))}
          />
          <QuickChips
            items={[
              ["5%", 5],
              ["8%", 8],
              ["12%", 12],
              ["20%", 20],
            ]}
            onPick={setTargetReturn}
          />

          <label htmlFor="targetDays">목표 기간 일 단위</label>
          <input
            id="targetDays"
            min={1}
            type="number"
            value={targetDays}
            onChange={(event) => setTargetDays(Number(event.target.value))}
          />
          <p className="fieldHint">예: 30은 30일, 90은 90일 기준입니다.</p>
          <QuickChips
            items={[
              ["1개월", 30],
              ["3개월", 90],
              ["6개월", 180],
              ["1년", 365],
            ]}
            onPick={setTargetDays}
          />

          <label htmlFor="maxLoss">거래당 최대 손실 %</label>
          <input
            id="maxLoss"
            max={5}
            min={0.25}
            step={0.25}
            type="number"
            value={maxLoss}
            onChange={(event) => setMaxLoss(Number(event.target.value))}
          />
          <p className="fieldHint">
            이 거래에서 감수할 최대 손실 예산은 약 {krw(capitalKrw * (maxLoss / 100))}입니다.
          </p>

          <button className="primary" disabled={loading} onClick={runAnalysis}>
            {loading ? "분석 중" : "분석하기"}
          </button>

          {error ? <div className="error">{error}</div> : null}
        </aside>

        <section className="result">
          <div className={`hero ${analysis ? badgeTone(analysis.action) : ""}`}>
            <div>
              <p className="eyebrow">최종 판단</p>
              <h2>{headline}</h2>
              {analysis ? (
                <>
                  <strong className="heroAction">{ko(analysis.action)}</strong>
                  <div className="actionLine">
                    <span>{actionCopy[analysis.action] ?? "추가 확인이 필요합니다."}</span>
                  </div>
                  <div className="heroDecisionGrid">
                    <HeroDecisionItem
                      label="권장 매수"
                      value={formatAmount(analysis.risk_plan.suggested_buy_amount, currency)}
                      caption={`${analysis.risk_plan.suggested_share_qty.toPrecision(6)}주`}
                    />
                    <HeroDecisionItem
                      label="익절"
                      value={formatPrice(analysis.risk_plan.take_profit_price_for_day, currency)}
                      caption={`+${formatAmount(analysis.risk_plan.expected_gain_if_take_profit, currency)}`}
                    />
                    <HeroDecisionItem
                      label="손절"
                      value={formatPrice(analysis.risk_plan.stop_loss_price_for_day, currency)}
                      caption={`-${formatAmount(analysis.risk_plan.expected_loss_if_stopped, currency)}`}
                      danger
                    />
                  </div>
                  <div className="heroMeta">
                    <span>확신도 {ko(analysis.brief.confidence)}</span>
                    <span>목표 {ko(analysis.feasibility)}</span>
                    <span>점수 {analysis.brief.score}/100</span>
                    <span>손익비 1:{analysis.risk_plan.risk_reward_ratio?.toFixed(2) ?? "N/A"}</span>
                  </div>
                  <div className="heroCtas">
                    <button type="button" onClick={savePlan}>매수 계획 저장</button>
                    <button type="button" onClick={runAnalysis}>다시 분석</button>
                  </div>
                  {savedAt ? (
                    <p className="savedNotice">
                      이 브라우저에 {new Date(savedAt).toLocaleString("ko-KR")} 기준 계획을 저장했습니다.
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
            {analysis ? (
              <div className="price">
                <span>현재가</span>
                <strong>{formatPrice(analysis.brief.reference_price, currency)}</strong>
                <small>{analysis.brief.data_quality.source}</small>
              </div>
            ) : null}
          </div>

          {analysis ? (
            <AnalysisView analysis={analysis} currency={currency} />
          ) : (
            <EmptyState />
          )}
        </section>
      </section>
    </main>
  );
}

function AnalysisView({ analysis, currency }: { analysis: Analysis; currency: Currency }) {
  const risk = analysis.risk_plan;
  const brief = analysis.brief;
  const riskItems = buildRiskItems(analysis);
  return (
    <>
      <section className="riskStrip">
        <div>
          <p className="eyebrow dangerText">주의 필요</p>
          <h3>손실 가능성을 키우는 요인</h3>
        </div>
        <div className="riskChips">
          {riskItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="simulation">
        <div>
          <p className="eyebrow">투자 시뮬레이션</p>
          <h3>{formatAmount(risk.suggested_buy_amount, currency)} 투자 기준</h3>
        </div>
        <div className="simNumbers">
          <div>
            <span>목표 수익</span>
            <strong className="gain">+{formatAmount(risk.expected_gain_if_take_profit, currency)}</strong>
          </div>
          <div>
            <span>최대 손실</span>
            <strong className="loss">-{formatAmount(risk.expected_loss_if_stopped, currency)}</strong>
          </div>
          <div>
            <span>손익비</span>
            <strong>1 : {risk.risk_reward_ratio?.toFixed(2) ?? "N/A"}</strong>
            <small>위험 1 대비 보상 {risk.risk_reward_ratio?.toFixed(2) ?? "N/A"}</small>
          </div>
        </div>
      </section>

      <section className="chartPanel">
        <div className="sectionTitle">
          <div>
            <p className="eyebrow">가격 레벨</p>
            <h3>익절·현재가·손절 구간</h3>
          </div>
          <span>연환산 목표 {pct(analysis.annualized_target_return_pct)}</span>
        </div>
        <PriceLevels analysis={analysis} currency={currency} />
      </section>

      <div className="contentGrid">
        <div className="panel">
          <h3>핵심 근거</h3>
          <ul>
            {brief.reasons.slice(0, 4).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h3>기간별 흐름</h3>
          <table>
            <thead>
              <tr>
                <th>기간</th>
                <th>수익률</th>
                <th>방향성</th>
                <th>최대 낙폭</th>
              </tr>
            </thead>
            <tbody>
              {analysis.horizons.map((item) => (
                <tr key={item.label}>
                  <td>{item.label}</td>
                  <td>{pct(item.return_pct)}</td>
                  <td>{ko(item.direction)}</td>
                  <td>{pct(item.max_drawdown_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function PriceLevels({ analysis, currency }: { analysis: Analysis; currency: Currency }) {
  const risk = analysis.risk_plan;
  const upPct = ((risk.take_profit_price_for_day / analysis.brief.reference_price) - 1) * 100;
  const downPct = ((risk.stop_loss_price_for_day / analysis.brief.reference_price) - 1) * 100;
  const levels = [
    { label: "익절", value: risk.take_profit_price_for_day, className: "gain" },
    { label: "현재가", value: analysis.brief.reference_price, className: "current" },
    { label: "손절", value: risk.stop_loss_price_for_day, className: "loss" },
  ];
  const min = Math.min(...levels.map((item) => item.value));
  const max = Math.max(...levels.map((item) => item.value));
  const range = Math.max(0.01, max - min);

  return (
    <div className="levelChart">
      <div className="rewardBadge">
        <strong>Risk / Reward 1:{risk.risk_reward_ratio?.toFixed(2) ?? "N/A"}</strong>
        <span>위로 {upPct.toFixed(1)}% · 아래로 {downPct.toFixed(1)}%</span>
      </div>
      {levels.map((item) => {
        const top = 100 - ((item.value - min) / range) * 100;
        return (
          <div className={`level ${item.className}`} key={item.label} style={{ top: `${top}%` }}>
            <span>{item.label}</span>
            <strong>{formatPrice(item.value, currency)}</strong>
          </div>
        );
      })}
      <div className="profitZone">수익 구간</div>
      <div className="lossZone">위험 구간</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty">
      <strong>Apple 또는 Bitcoin을 선택하세요.</strong>
      <span>분석이 끝나면 가장 먼저 아래 3가지를 판단합니다.</span>
      <div className="emptyQuestions">
        <span>지금 사도 되나</span>
        <span>얼마를 사나</span>
        <span>어디서 손절하나</span>
      </div>
    </div>
  );
}

function HeroDecisionItem({
  label,
  value,
  caption,
  danger = false,
}: {
  label: string;
  value: string;
  caption: string;
  danger?: boolean;
}) {
  return (
    <div className={`heroDecisionItem ${danger ? "danger" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  );
}

function QuickChips({ items, onPick }: { items: [string, number][]; onPick: (value: number) => void }) {
  return (
    <div className="quickChips">
      {items.map(([label, value]) => (
        <button key={label} type="button" onClick={() => onPick(value)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function CurrencyToggle({
  currency,
  setCurrency,
}: {
  currency: Currency;
  setCurrency: (value: Currency) => void;
}) {
  return (
    <div className="currencyToggle">
      {(["KRW", "USD"] as Currency[]).map((item) => (
        <button
          className={currency === item ? "active" : ""}
          key={item}
          type="button"
          onClick={() => setCurrency(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function buildRiskItems(analysis: Analysis) {
  const items = [
    ...analysis.brief.risks,
    ...analysis.warnings,
    analysis.feasibility === "UNREALISTIC" ? "목표 수익률이 현재 변동성 대비 공격적입니다." : "",
    analysis.brief.confidence === "LOW" ? "AI 확신도가 낮아 보수적인 판단이 필요합니다." : "",
  ].filter(Boolean);
  return Array.from(new Set(items)).slice(0, 4);
}

function badgeTone(value: string) {
  if (["UNREALISTIC", "AVOID", "SELL"].includes(value)) return "danger";
  if (["STRETCHED", "HOLD", "PARTIAL_SELL"].includes(value)) return "warn";
  return "positive";
}

function formatAmount(value: number, currency: Currency) {
  const converted = currency === "KRW" ? value * USD_KRW : value;
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(converted);
}

function formatPrice(value: number, currency: Currency) {
  return formatAmount(value, currency);
}
