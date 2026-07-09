/**
 * StockPageLayout — `/stock/[ticker]` 카드리스·T4 티어링 본문(stock-detail-reskin).
 *
 * 노스스타 `#detailScreen` 정합 — **단일 컬럼 카드리스**(데스크탑·모바일 공통). 카드 박스 대신
 * 헤어라인·여백으로 섹션을 구분(토스 톤). 정보 티어링(T4):
 *   - 항시(always): 시세 헤더 → 가격 차트(분/일/주/월봉) → 컴팩트 시그널 요약. 화면에 늘 떠 있다.
 *   - 온디맨드(잠깐): 회사개요·최근공시·투자자 수급 — **데스크탑·모바일 공통 기본 접힘**(CollapsibleCard
 *     `variant="flat"`). 접힘 상태에선 자식이 미마운트라 해당 API 도 펼치기 전까진 호출되지 않는다.
 *
 * 이전(카드 스택) 대비 변경:
 *   - 데스크탑 2-col grid + 차트 확대/축소 토글 제거 → 차트가 항상 콘텐츠 전폭이라 "확대"가 무의미해짐.
 *     차트 컨트롤 상태(봉/기간/차트타입/오버레이)는 그대로 부모가 소유(StockDailyChart controlled).
 *   - 반응형 분기(useBreakpoint)는 ChartShell 내부(기간 드롭다운)만 남기고, 레이아웃은 단일화.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { StockHeader } from "./StockHeader";
import { AiVerdictStrip } from "./AiVerdictStrip";
import { StockChartSkeleton } from "./StockChartSkeleton";
import { SignalSummary } from "./SignalSummary";
import { CompanyOverview } from "./CompanyOverview";
import { DisclosureList } from "./DisclosureList";
import { StockInvestorTrend } from "./StockInvestorTrend";
import { StockDepthSection } from "@/components/stock/StockDepthSection";
import { useMediaQuery } from "@/hooks/utils/useMediaQuery";
import { PEEK_DOCK_QUERY } from "@/hooks/stock/peekProvider";
import { useAIAnalysisContext } from "@/hooks/stock/aiAnalysisProvider";
import { useQueryAIDecision } from "@/hooks/stock/useQueryAIDecision";
import { useChartOptions } from "@/hooks/stock/useChartOptions";
import { deriveAiVerdictLevels } from "@/lib/utils/aiVerdictLevels";
import { STOCK_DETAIL_TIERING_NOTE } from "@/lib/copy/profile/stockDetail";
import {
  DEFAULT_CHART_TYPE,
  DEFAULT_DAYS,
  DEFAULT_INTERVAL,
  DEFAULT_MINUTE_PRIOR_DAYS,
  DEFAULT_TIMEFRAME,
  defaultDaysForPeriod,
  type ChartType,
  type MainInterval,
} from "./stockChartConfig";

/**
 * 가격 차트 — recharts(≈104kB gzip)를 끌어오므로 `next/dynamic({ssr:false})` 로 지연 로드
 * (stock-route-perf #3 · mobile-perf WS-4 완료). recharts 가 라우트 셸(첫 로드) 청크에서 빠져
 * 헤더·시그널이 먼저 페인트되고, 차트는 청크 로드 후 스트리밍된다. 컨트롤·동작은 로드 후 동일
 * (props 그대로 전달). loading 스켈레톤은 StockChartSkeleton — loading.tsx·내부 로딩과 높이 정합.
 */
const StockDailyChart = dynamic(
  () => import("./StockDailyChart").then((m) => m.StockDailyChart),
  { ssr: false, loading: () => <StockChartSkeleton /> },
);

// ── 초광폭 호가·체결강도 도크 치수(런타임 실측 — Tailwind 토큰 대상 아님, StockPeekDock 관례 동일) ──
/** 도크 최소 폭(px) — ≈1920px + 사이드바 펼침에서 콘텐츠 우측 여백에 겹침 없이 들어가는 치수. */
const DEPTH_DOCK_MIN_WIDTH = 240;
/** 도크 최대 폭(px) — 초광폭에서도 과하게 커지지 않도록 상한("안크게"). */
const DEPTH_DOCK_MAX_WIDTH = 300;
/** 콘텐츠 우측 끝 ~ 도크 좌측 간격(px) — `ml-md` 와 동기. */
const DEPTH_DOCK_GAP = 10;
/** 도크 우측 ~ main 우측(세로 스크롤바 포함) 최소 여백(px). */
const DEPTH_DOCK_EDGE = 16;
/** 콘텐츠 컨테이너 최대 폭(px) — `spacing.main-max-w` 토큰과 동기(여백 산출용 레이아웃 상수). */
const MAIN_MAX_W = 1152;

/**
 * 도크 폭 실측 — `<main>`(overflow-y-auto) 안에서 중앙 정렬된 콘텐츠(1152px) 우측 여백에 맞춘다.
 * 좌측 앵커는 CSS `left-full`(콘텐츠 우측 끝) + `ml-md` 라 여기선 폭만 계산해 `[MIN,MAX]` 클램프.
 * 사이드바 펼침/접힘·초광폭 정도에 따라 여백이 달라지므로 뷰포트가 아니라 main rect 로 산출한다.
 */
function measureDepthDockWidth(): number {
  if (typeof document === "undefined") return DEPTH_DOCK_MIN_WIDTH;
  const rect = document.querySelector("main")?.getBoundingClientRect();
  if (!rect) return DEPTH_DOCK_MIN_WIDTH;
  const contentRight = rect.left + Math.min(rect.width, (rect.width + MAIN_MAX_W) / 2);
  const available = rect.right - contentRight - DEPTH_DOCK_GAP - DEPTH_DOCK_EDGE;
  return Math.round(
    Math.min(DEPTH_DOCK_MAX_WIDTH, Math.max(DEPTH_DOCK_MIN_WIDTH, available)),
  );
}

export function StockPageLayout({ ticker }: { ticker: string }) {
  const { openFor } = useAIAnalysisContext();
  const openAIAnalysis = () => openFor(ticker);

  // 차트 컨트롤 상태 — 부모가 소유해 StockDailyChart 를 controlled 로 두고 값(라인/캔들·봉·간격·기간)을 보존.
  const [interval, setChartInterval] = useState<MainInterval>(DEFAULT_INTERVAL);
  const [days, setDays] = useState<number>(DEFAULT_DAYS); // 일/주/월봉 보기 범위
  const [timeframe, setTimeframe] = useState<number>(DEFAULT_TIMEFRAME); // 분봉 간격(분)
  const [minutePriorDays, setMinutePriorDays] = useState<number>(DEFAULT_MINUTE_PRIOR_DAYS); // 분봉 기간(과거 거래일 수)
  const [chartType, setChartType] = useState<ChartType>(DEFAULT_CHART_TYPE);
  // 오버레이 옵션(이평선·매물대·볼린저·VWAP·거래량 이평) — 이평선만 기본 ON, 드롭다운 체크박스로 토글. localStorage 지속.
  const { options: chartOptions, toggle: toggleChartOption } = useChartOptions();

  // AI 판정 차트 오버레이 — 저장된 종합분석 결론에서 목표/재진입·손절 레벨 파생(base_price 없으면 null).
  const { data: aiDecisionData } = useQueryAIDecision(ticker);
  const savedDecision = aiDecisionData?.decision?.decision ?? null;
  const aiLevels = useMemo(
    () => (savedDecision ? deriveAiVerdictLevels(savedDecision) : null),
    [savedDecision],
  );
  // 오버레이 표시 여부 — "차트보기"(?ai=1)로 진입하면 자동 ON, 그냥 검색이면 OFF(토글로 켬).
  // 마운트 시 URL 을 1회 읽어 초기화(useSearchParams Suspense 요구 회피, 클라 전용).
  const [showAiLevels, setShowAiLevels] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("ai") === "1") setShowAiLevels(true);
  }, []);
  // 토글 ↔ URL(?ai=1) 동기화 — "차트보기"로 진입하든 수동 토글이든 표시 상태가 URL 에 일관되게 반영돼
  //   새로고침·공유·뒤로가기에서 보존된다. history.replaceState 로 소프트 갱신(Next 재페치·스크롤 없음).
  const handleToggleAi = (next: boolean) => {
    setShowAiLevels(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("ai", "1");
    else url.searchParams.delete("ai");
    window.history.replaceState(null, "", url);
  };

  // 초광폭(콘텐츠 우측 여백이 큼) — 호가·체결강도를 차트 우측에 도크로 띄운다(그 미만은 차트 아래 2단).
  const isUltraWide = useMediaQuery(PEEK_DOCK_QUERY);
  const [dockWidth, setDockWidth] = useState(DEPTH_DOCK_MIN_WIDTH);
  useEffect(() => {
    if (!isUltraWide) return;
    const measure = () => setDockWidth(measureDepthDockWidth());
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isUltraWide]);

  function handleIntervalChange(next: MainInterval) {
    setChartInterval(next);
    // 분봉은 days 대신 timeframe(기본 5분)로 제어 — 범위 리셋 불필요. 일/주/월봉만 해당 봉 첫 범위로.
    if (next !== "m") setDays(defaultDaysForPeriod(next));
  }

  const chartControls = {
    interval,
    days,
    timeframe,
    minutePriorDays,
    chartType,
    overlays: chartOptions,
    onIntervalChange: handleIntervalChange,
    onDaysChange: setDays,
    onTimeframeChange: setTimeframe,
    onMinutePriorDaysChange: setMinutePriorDays,
    onChartTypeChange: setChartType,
    onToggleOverlay: toggleChartOption,
  };

  return (
    <div className="flex flex-col">
      {/* ── 항시(T4): 시세 헤더 ── */}
      <StockHeader ticker={ticker} onAIAnalysis={openAIAnalysis} />

      {/* ── 항시: 가격 차트 — 초광폭이면 우측 여백에 호가·체결강도 도크를 절대배치로 띄운다. ── */}
      <div className="relative mt-lg border-t border-border-line pt-lg">
        {/* AI 판정 스트립 — 저장 결론 있을 때만. 판정 배지 + 레벨 오버레이 토글. */}
        {aiLevels && savedDecision ? (
          <AiVerdictStrip
            levels={aiLevels}
            decision={savedDecision}
            show={showAiLevels}
            onToggle={handleToggleAi}
          />
        ) : null}
        <StockDailyChart
          ticker={ticker}
          {...chartControls}
          aiLevels={aiLevels}
          showAiLevels={showAiLevels}
        />
        {isUltraWide ? (
          // 콘텐츠 우측 끝(left-full) + gap 앵커, 폭은 실측(우측 여백에 맞춤). 차트와 함께 스크롤.
          <aside
            className="absolute left-full top-lg ml-md"
            style={{ width: dockWidth }}
          >
            <StockDepthSection ticker={ticker} />
          </aside>
        ) : null}
      </div>

      {/* ── 초광폭 아님: 차트 아래 호가창(좌)·체결강도(우) 2단(모바일 세로 스택). ── */}
      {!isUltraWide ? (
        <div className="mt-lg border-t border-border-line pt-lg">
          <StockDepthSection ticker={ticker} />
        </div>
      ) : null}

      {/* ── 항시: 컴팩트 시그널 요약(플랫) — 시맨틱 <section> 은 자식(SignalSummary)이 소유 ── */}
      <div className="mt-lg border-t border-border-line pt-lg">
        <SignalSummary ticker={ticker} />
      </div>

      {/* ── 온디맨드(T4): 회사개요·최근공시·수급 — 데스크탑·모바일 공통 기본 접힘 ── */}
      <div className="mt-lg border-t border-border-line">
        <CompanyOverview ticker={ticker} collapsible />
        <DisclosureList ticker={ticker} count={5} collapsible />
        <StockInvestorTrend ticker={ticker} collapsible />
      </div>

      {/* T4 안내 — 무엇이 항시이고 무엇이 펼침인지 */}
      <p className="mt-md text-caption text-text-muted">
        {STOCK_DETAIL_TIERING_NOTE}
      </p>
    </div>
  );
}
