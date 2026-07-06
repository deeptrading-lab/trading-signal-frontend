"use client";

import { cn } from "@/lib/utils/cn";
import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import { COPY } from "@/lib/copy/stock/aiAnalysis";

/**
 * 진행중(running) 스트리밍 프리미티브 — **per-element 인라인 스트림**.
 *
 * 진행중 뷰는 완료 뷰와 같은 flat 구조(분석가 4행·토론 버블 스택·종합 행/카드)를 그리고, **진행 중인
 * 요소 안에서** 라이브 토큰이 흐른다. 그래서 단일 stream-box + 상태 pip 대신, 각 행/버블/카드가
 * 자기 토큰을 `InlineStream`(끝부분 truncate + 커서)으로 인라인 노출한다. 병렬 분석가 4인·리스크 3인이
 * 동시에 각자 흐르는 게 핵심(단일 활성 표기의 한계 해소).
 *
 * `StreamBox` 는 최종 판정(PM 단일)만 쓰는 박스형 스트림으로 남는다.
 *
 * 색은 앱 토큰만(#280 매핑) · 커서/맥박은 `motion-reduce` 에서 정지(과한 애니메이션 억제).
 */

/**
 * 라이브 토큰 커서 — accent 세로바 blink(기본). 토론 버블 등은 방향 톤(`bg-signal-up`/`bg-signal-down`)을
 * `tone` 으로 주입한다. 장식이므로 aria-hidden.
 */
export function StreamCursor({ tone = "bg-accent-vivid" }: { tone?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "ml-0.5 inline-block h-3.5 w-0.5 align-middle animate-pulse motion-reduce:animate-none",
        tone,
      )}
    />
  );
}

/**
 * per-element 인라인 라이브 토큰 — 행/버블/카드 안에서 streamingChunk 끝부분만 흐르게 하고 커서를 끝에 둔다.
 * 완료 요약과 같은 자리에 인라인으로 놓여 진행 중 요소가 컴팩트하게 유지된다(단일 stream-box 대체).
 *
 * - 마크다운 기호·개행을 걷어 한 흐름으로 만들고 최근 `maxChars` 만(커서가 항상 끝에 보이게).
 * - 토큰이 아직 없으면 `fallback`(에이전트 진행 문구)으로 빈 화면을 막는다.
 * - 높이는 `maxChars` 예산으로 bound(행/버블이 과하게 길어지지 않게 truncate) — 좁은 칸일수록 작게 준다.
 */
export function InlineStream({
  text,
  fallback,
  maxChars = 120,
  cursorTone,
}: {
  text: string;
  fallback?: string;
  maxChars?: number;
  cursorTone?: string;
}) {
  const flowing = text ? stripMarkdown(text).replace(/\s+/g, " ").trim() : "";
  const tail = flowing.length > maxChars ? `…${flowing.slice(-maxChars)}` : flowing;
  const body = tail || fallback || COPY.card.analyzing;

  return (
    <span className="whitespace-pre-wrap break-words">
      {body}
      <StreamCursor tone={cursorTone} />
    </span>
  );
}

/**
 * 최종 판정(PM 단일) 전용 박스형 스트림 — `.sbx-who`(accent, "{에이전트} · 작성 중") + 라이브 토큰 tail + 커서.
 * 단일 에이전트라 인라인 대신 회색 박스로 글랜스 존재감을 준다(분석가·토론·종합은 InlineStream per-element).
 */
export function StreamBox({
  who,
  text,
  fallback,
}: {
  who: string;
  text: string;
  fallback?: string;
}) {
  return (
    <div className="rounded-md border border-border-line bg-surface-muted px-md py-md text-caption leading-relaxed text-text-strong">
      <span className="mb-1.5 block text-caption font-extrabold text-accent-vivid">{who}</span>
      <InlineStream text={text} fallback={fallback} maxChars={220} />
    </div>
  );
}
