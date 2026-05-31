import { redirect } from "next/navigation";

/** `/stock` 직접 진입 시 홈으로 이동 — 종목 분석은 검색·관심종목에서 진입. */
export default function StockIndexPage() {
  redirect("/");
}
