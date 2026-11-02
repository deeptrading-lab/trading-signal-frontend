/**
 * `/analyze` — 옛 "AI 분석"(12에이전트 판정 카드) 자리. PRD `swing-judgment` PR-5 에서 그 파이프라인을
 * 걷어내고 스윙 체크(`/swing`)로 보낸다 — 예전 북마크·링크가 빈 화면으로 떨어지지 않게.
 */

import { redirect } from "next/navigation";

export default function AnalyzePage() {
  redirect("/swing");
}
