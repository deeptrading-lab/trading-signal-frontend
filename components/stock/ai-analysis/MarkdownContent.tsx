import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { stripStrikethrough } from "@/lib/utils/stripMarkdown";

/**
 * 카드 상세 본문의 마크다운 렌더러 — `CardDetailOverlay` 가 `next/dynamic` 으로 지연 로드한다.
 *
 * react-markdown + remark-gfm(≈39kB gzip)을 별도 청크로 분리해, 분석 패널을 열어도 **상세 카드를
 * 실제로 펼치기 전까지는** 로드되지 않게 한다(perf WS-1). 오버레이 자체(motion/AnimatePresence)는
 * `CardDetailOverlay` 에 남겨 슬라이드 애니메이션을 보존한다.
 */
// 색은 `.markdown-content.prose`(components.css)가 prose 변수를 토큰으로 오버라이드 → dark: 불필요.
// 여기선 배경(th/code)·간격·폭·정렬만 prose-* 모디파이어(토큰)로 지정.
const PROSE =
  "prose prose-sm max-w-none markdown-content " +
  "prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1.5 " +
  "prose-p:leading-relaxed prose-p:my-1 prose-li:my-0.5 " +
  "prose-table:text-xs prose-table:w-full " +
  "prose-th:bg-surface-muted prose-th:font-semibold prose-th:px-2 prose-th:py-1.5 prose-th:text-left " +
  "prose-td:px-2 prose-td:py-1.5 prose-td:border-b " +
  "prose-code:bg-accent-vivid-soft prose-code:px-1 prose-code:rounded";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className={PROSE}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripStrikethrough(content)}</ReactMarkdown>
    </div>
  );
}
