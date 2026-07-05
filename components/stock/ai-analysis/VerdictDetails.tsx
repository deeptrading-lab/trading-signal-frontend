"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";

/**
 * VerdictDetails — 노스스타 최종 판정 "플랫 상세 스택"(ai-view-northstar-redesign).
 *
 * FinalVerdictCard 를 히어로(VerdictHero)/상세(이 컴포넌트)로 분해한 뒤 상세부만 담당한다.
 * 판정 라벨·신호강도·목표/손절/손익비·예상기간은 **히어로** 가 그리므로 여기선 반복하지 않고,
 * 노스스타 `.fv-stack` 순서(근거 → 집행 가이드 → 전망 → 강점/리스크)의 상세만 flat 스택으로 쌓는다:
 *   - `.fv-reason`   : 근거(surface-muted 박스) — data.reasoning
 *   - `.guides`      : 신규 진입(좌측 바 accent-vivid) / 보유 중(좌측 바 text-muted) 가이드
 *   - `.outlook-2`   : 단기·중기 전망 2열(좌측 보더)
 *   - `.sr-2`        : 핵심 강점(↑ signal-up) / 핵심 리스크(↓ signal-down) 2열
 * limitedData 경고(상단)·면책 고지(하단)는 회귀 방지로 보존한다.
 *
 * 라이브(최종 판정 페이즈 본문)·저장(SavedDecisionView·ProdAnalysisQueueCard)에서 히어로 아래에
 * 동일하게 렌더된다. signal/calibration 등 신뢰도 축은 히어로 소관이라 이 컴포넌트는 받지 않는다.
 */

// 부호 숫자(+12.3%, -14.7 …) 또는 범위 구분자(~)를 토큰화.
// "-14.7~-18.6%" 처럼 굵은 본문 안에서 ~ 와 - 가 붙어 구분이 어려운 문제를 풀기 위해,
// 부호 숫자는 KR 등락 색(+빨강/−파랑)으로, ~ 는 비굵게·연하게·좌우 여백으로 분리한다.
const INLINE_TOKEN = /([+-]\d[\d,]*(?:\.\d+)?%?)|([~∼〜])/g;

/** 한 텍스트 런(굵기 동일 구간)을 부호 숫자 색·범위 구분자 분리까지 적용해 노드 배열로. */
function renderRun(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_TOKEN.lastIndex = 0;
  while ((m = INLINE_TOKEN.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      // 앞 글자가 숫자면(예: 2024-2025) 부호가 아니라 범위/뺄셈 → 색 입히지 않음.
      const prev = text[m.index - 1];
      const isSign = !prev || !/[\d.]/.test(prev);
      nodes.push(
        isSign ? (
          <span
            key={`${keyBase}-n${m.index}`}
            className={cn(
              // KR 관례: +상승=signal-up(빨강) / −하락=signal-down(파랑). 토큰 자동 다크.
              m[1][0] === "+" ? "text-signal-up" : "text-signal-down",
            )}
          >
            {m[1]}
          </span>
        ) : (
          m[1]
        ),
      );
    } else {
      nodes.push(
        <span key={`${keyBase}-t${m.index}`} className="mx-0.5 font-normal text-text-muted">
          {m[2]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** **bold** 마크다운 + 부호 숫자 색/범위 구분자 분리를 처리하는 경량 인라인 렌더러. */
function InlineBold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-text-strong">
            {renderRun(part, `b${i}`)}
          </strong>
        ) : (
          <span key={i}>{renderRun(part, `p${i}`)}</span>
        ),
      )}
    </>
  );
}

/** 집행 가이드 한 블록 — 좌측 4px 방향 바(신규=accent / 보유=회색) + 태그 + 문장. */
function Guide({
  variant,
  label,
  text,
}: {
  variant: "new" | "hold";
  label: string;
  text: string;
}) {
  return (
    // 노스스타 `.guide` — 좌측 바를 absolute 스트립으로(라운드 코너에서 안 휘게 클립). pl-lg 로 바 클리어.
    <div className="relative overflow-hidden rounded-sm border border-border-line bg-surface-muted py-sm pl-lg pr-md">
      {/* `.guide::before` — 좌측 방향 바(신규=accent-vivid / 보유=text-muted). */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          variant === "new" ? "bg-accent-vivid" : "bg-text-muted",
        )}
        aria-hidden="true"
      />
      <p
        className={cn(
          "mb-0.5 text-caption font-extrabold",
          variant === "new" ? "text-accent-vivid" : "text-text-muted",
        )}
      >
        {label}
      </p>
      <p className="text-body-sm leading-relaxed text-text-strong">
        <InlineBold text={text} />
      </p>
    </div>
  );
}

export function VerdictDetails({ data }: { data: FinalDecision }) {
  const hasOutlook = data.short_term_outlook || data.mid_term_outlook;
  const hasStrengths = data.key_strengths.length > 0;
  const hasRisks = data.key_risks.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-md"
    >
      {/* 데이터 제한 경고(봉 수 부족) — 상단 앰버 노트. 회귀 방지로 보존. */}
      {data.limitedData && (
        <div className="flex items-start gap-1.5 rounded-md bg-warn-soft px-md py-sm text-caption font-medium text-warn">
          <AlertTriangle size={14} className="mt-px flex-shrink-0" />
          <span>{COPY.verdict.limitedData(data.bars)}</span>
        </div>
      )}

      {/* .fv-reason — 근거(surface-muted 박스). 노스스타 border-radius:8px → rounded-sm. */}
      <div className="rounded-sm border border-border-line bg-surface-muted px-md py-sm text-body-sm leading-relaxed text-text-strong">
        <InlineBold text={data.reasoning} />
      </div>

      {/* .guides — 신규 진입 / 보유 중 집행 가이드(있는 것만). */}
      {(data.new_entry_strategy || data.holder_strategy) && (
        <div className="flex flex-col gap-sm">
          {data.new_entry_strategy && (
            <Guide variant="new" label={COPY.verdict.newEntryLabel} text={data.new_entry_strategy} />
          )}
          {data.holder_strategy && (
            <Guide variant="hold" label={COPY.verdict.holderLabel} text={data.holder_strategy} />
          )}
        </div>
      )}

      {/* .outlook-2 — 단기·중기 전망 2열(좌측 보더). 모바일은 1열 스택. */}
      {hasOutlook && (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          {data.short_term_outlook && (
            // 노스스타 `.outlook{border-left:2px solid var(--border-2)}` — border-line 보다 진한 세로선.
            <div className="border-l-2 border-text-muted/20 pl-md">
              <p className="text-label-sm text-text-strong">{COPY.verdict.shortTermLabel}</p>
              <p className="mt-0.5 text-caption leading-relaxed text-text-muted">
                <InlineBold text={data.short_term_outlook} />
              </p>
            </div>
          )}
          {data.mid_term_outlook && (
            <div className="border-l-2 border-text-muted/20 pl-md">
              <p className="text-label-sm text-text-strong">{COPY.verdict.midTermLabel}</p>
              <p className="mt-0.5 text-caption leading-relaxed text-text-muted">
                <InlineBold text={data.mid_term_outlook} />
              </p>
            </div>
          )}
        </div>
      )}

      {/* .sr-2 — 핵심 강점(↑ signal-up) / 핵심 리스크(↓ signal-down) 2열. 모바일은 1열 스택. */}
      {(hasStrengths || hasRisks) && (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          {hasStrengths && (
            <div>
              <h5 className="mb-sm flex items-center gap-1 text-label-sm text-signal-up">
                <TrendingUp size={14} /> {COPY.verdict.strengths}
              </h5>
              <ul className="flex flex-col gap-sm">
                {data.key_strengths.map((s, i) => (
                  <li key={i} className="flex gap-sm text-body-sm leading-relaxed text-text-strong">
                    <span className="shrink-0 font-bold text-signal-up">↑</span>
                    <span className="min-w-0">
                      <InlineBold text={s} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasRisks && (
            <div>
              <h5 className="mb-sm flex items-center gap-1 text-label-sm text-signal-down">
                <TrendingDown size={14} /> {COPY.verdict.risks}
              </h5>
              <ul className="flex flex-col gap-sm">
                {data.key_risks.map((r, i) => (
                  <li key={i} className="flex gap-sm text-body-sm leading-relaxed text-text-strong">
                    <span className="shrink-0 font-bold text-signal-down">↓</span>
                    <span className="min-w-0">
                      <InlineBold text={r} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 면책 고지 — 회귀 방지로 보존(하단 subtle). */}
      <div className="flex items-start gap-1.5 text-caption text-text-muted">
        <Info size={12} className="mt-0.5 flex-shrink-0" />
        <p>{COPY.verdict.disclaimer}</p>
      </div>
    </motion.div>
  );
}
