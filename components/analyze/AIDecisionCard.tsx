/**
 * AIDecisionCard — 저장된 한 종목의 AI 분석 결론 요약 행(카드리스 플랫 행).
 *
 * analyze-reskin — "카드 벽(wall of cards)"이 가장 강한 AI 느낌이라 그리드 카드 → 플랫 목록 행으로 낮춘다.
 *   홈 랭킹(`RankRow`)·관심종목(`WatchlistRow`) 정합: `ListRow`(헤어라인) + `grid-cols-[auto_1fr_auto]`.
 *   - 좌: 방향 톤 칩(강세=빨강/약세=파랑/중립 회색, signal-up/down soft 토큰 — 다크 자동 대응).
 *   - 중: 종목명(코드 미표시) + 판정 라벨 + (재분석 배지) / 보조 메타(확신도·유효기간·토큰·데이터경고·시각).
 *   - 우: 케밥(⋮) 재분석 메뉴.
 * 박스·좌측 강조바·호버 블러 오버레이·아이콘 대형 원을 걷어내고, 행 hover 하이라이트로 클릭 가능을 알린다.
 *
 * 행 클릭 → 상세 시트(onSelect). ★ a11y — 행이 클릭 가능한 div 이므로 케밥 버튼은 자체적으로
 *   `stopPropagation`(AIDecisionCardMenu.toggleMenu)으로 행 클릭과 분리한다(home-reskin 동일 패턴).
 * 색 규칙(강세=빨강/약세=파랑)은 FinalVerdictCard·SentimentBadge 팔레트와 동일(한국 시장 관례).
 */

"use client";

import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, Minus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/formatRelativeTime";
import { ListRow } from "@/components/ui/ListRow";
import { fmtCostApprox, fmtTokensApprox } from "./format";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import {
  VERDICT_LABEL,
  isBullishVerdict,
  isBearishVerdict,
} from "@/components/stock/ai-analysis/FinalVerdictCard";
import type { FinalVerdict } from "@/lib/types/stock/aiAnalysis";
import type { AIDecisionListItem } from "@/lib/types/stock/aiAnalysisDecisions";
import { AIDecisionCardMenu } from "./AIDecisionCardMenu";
import { InflightBadge } from "./InflightBadge";
import { CARD_TOKENS_NONE, MEASURE_BADGE_UNMEASURED } from "@/lib/copy/analyze/labels";

type Tone = "bull" | "bear" | "neutral";

function toneOf(verdict: FinalVerdict): Tone {
  if (isBullishVerdict(verdict)) return "bull";
  if (isBearishVerdict(verdict)) return "bear";
  return "neutral";
}

/** 방향 톤 칩 배경/글자 — soft 토큰(다크 모드 자동 전환). 대형 컬러 원 대신 32px 칩으로 낮춤. */
const TONE_CHIP: Record<Tone, string> = {
  bull: "bg-signal-up-soft text-signal-up",
  bear: "bg-signal-down-soft text-signal-down",
  neutral: "bg-surface-muted text-text-muted",
};

/** 판정 라벨 글자색 — 부호 토큰(합성 클래스 아님, 사이즈 override 없어 twMerge 드롭 없음). */
const TONE_TEXT: Record<Tone, string> = {
  bull: "text-signal-up",
  bear: "text-signal-down",
  neutral: "text-text-muted",
};

const TONE_ICON: Record<Tone, typeof TrendingUp> = {
  bull: TrendingUp,
  bear: TrendingDown,
  neutral: Minus,
};

/** 토큰 메타 문구(근사) — "약 76만 토큰 · $2.8" / "측정 안 됨" / "토큰 기록 없음". */
function tokenMetaLabel(item: AIDecisionListItem): string {
  const { tokens } = item;
  if (!tokens) return CARD_TOKENS_NONE;
  if (!tokens.measured) return MEASURE_BADGE_UNMEASURED;
  const total = (tokens.totalInputTokens ?? 0) + (tokens.totalOutputTokens ?? 0);
  const cost = tokens.totalCostUsd !== null ? ` · ${fmtCostApprox(tokens.totalCostUsd)}` : "";
  return `${fmtTokensApprox(total)} 토큰${cost}`;
}

interface AIDecisionCardProps {
  item: AIDecisionListItem;
  /** 컨테이너가 해석한 종목명(없으면 ticker). */
  name: string;
  onSelect: (item: AIDecisionListItem) => void;
}

export function AIDecisionCard({ item, name, onSelect }: AIDecisionCardProps) {
  const verdict = item.decision.verdict;
  const tone = toneOf(verdict);
  const Icon = TONE_ICON[tone];
  const open = () => onSelect(item);

  // 보조 메타 — 확신도(있으면) · 유효기간 · 토큰 · 분석시각. 데이터 경고는 색이 있어 별도 노드로.
  const metaParts: ReactNode[] = [];
  if (item.signal) metaParts.push(COPY.verdict.signalStrength(item.signal.score));
  metaParts.push(item.decision.time_horizon);
  metaParts.push(<span className="tabular-nums">{tokenMetaLabel(item)}</span>);
  metaParts.push(formatRelativeTime(item.updatedAt));

  return (
    <ListRow
      role="listitem"
      tabIndex={0}
      aria-label={`${name} AI 분석 결론 전체 보기`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        "-mx-sm cursor-pointer rounded-sm px-sm transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none",
        "grid grid-cols-[auto_1fr_auto] items-center gap-md",
      )}
    >
      {/* 방향 톤 칩 */}
      <span
        className={cn(
          "inline-grid h-8 w-8 shrink-0 place-items-center rounded-full",
          TONE_CHIP[tone],
        )}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>

      {/* 종목명 + 판정 / 보조 메타 */}
      <div className="min-w-0">
        <div className="flex items-center gap-sm">
          <span className="truncate text-body-sm-strong text-text-strong">{name}</span>
          <span className={cn("shrink-0 text-body-sm-strong", TONE_TEXT[tone])}>
            {VERDICT_LABEL[verdict]}
          </span>
          {/* 재분석 진행중이면 배지(이전 결론은 그대로 유지). */}
          {item.reanalysis && <InflightBadge status={item.reanalysis.status} />}
        </div>
        <div className="mt-xs flex flex-wrap items-center gap-x-xs gap-y-xs text-caption text-text-muted">
          {metaParts.map((part, i) => (
            <span key={i} className="inline-flex items-center gap-x-xs">
              {i > 0 && <span aria-hidden="true">·</span>}
              {part}
            </span>
          ))}
          {item.decision.limitedData && (
            <span className="inline-flex items-center gap-x-xs text-warn">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {COPY.verdict.limitedDataShort(item.decision.bars)}
            </span>
          )}
        </div>
      </div>

      {/* 케밥(⋮) 재분석 메뉴 — 자체 stopPropagation 으로 행 클릭과 분리 */}
      <AIDecisionCardMenu item={item} name={name} />
    </ListRow>
  );
}
