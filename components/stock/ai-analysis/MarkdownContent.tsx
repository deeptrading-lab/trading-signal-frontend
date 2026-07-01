import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * 카드 상세 본문의 마크다운 렌더러 — `CardDetailOverlay` 가 `next/dynamic` 으로 지연 로드한다.
 *
 * react-markdown + remark-gfm(≈39kB gzip)을 별도 청크로 분리해, 분석 패널을 열어도 **상세 카드를
 * 실제로 펼치기 전까지는** 로드되지 않게 한다(perf WS-1). 오버레이 자체(motion/AnimatePresence)는
 * `CardDetailOverlay` 에 남겨 슬라이드 애니메이션을 보존한다.
 */
const PROSE =
  "prose prose-sm prose-slate dark:prose-invert max-w-none " +
  "prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1.5 " +
  "prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:my-1 " +
  "prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-li:my-0.5 " +
  "prose-strong:text-slate-800 dark:prose-strong:text-slate-100 " +
  "prose-table:text-xs prose-table:w-full " +
  "prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:font-semibold prose-th:px-2 prose-th:py-1.5 prose-th:text-left " +
  "prose-td:px-2 prose-td:py-1.5 prose-td:border-b prose-td:border-slate-200 dark:prose-td:border-slate-700 " +
  "prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-blue-50 dark:prose-code:bg-blue-900/20 prose-code:px-1 prose-code:rounded prose-code:text-[11px] " +
  "prose-hr:border-slate-200 dark:prose-hr:border-slate-700";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className={PROSE}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
