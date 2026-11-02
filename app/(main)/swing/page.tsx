/**
 * `/swing` — 스윙 체크 스크리너(PRD `swing-judgment` PR-3, 디자인 `docs/design/swing-ui.md`).
 *
 * 매일 07:20 KST 크론이 전 거래일 확정 데이터로 규칙서 swing-v1 판정을 저장하고(PR-2), 이 화면은
 * 저장 행을 읽기만 한다: SwingScreenerContainer → useQuerySwingScreener → /api/swing/screener → Supabase.
 * 체크리스트 모드(PR-1 검증 결과) — 매수 추천이 아니라 조건 충족 현황과 주의 사유를 보여 준다.
 */

import { Suspense } from "react";
import { SwingScreenerContainer } from "@/components/swing/SwingScreenerContainer";
import { SWING_PAGE_TITLE } from "@/lib/copy/swing/labels";

export default function SwingPage() {
  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg">
      {/* 전 페이지 공통 — 시각 타이틀 없음, 문서 아웃라인용 h1 만 sr-only. */}
      <header className="sr-only">
        <h1 className="text-h1 text-text-strong">{SWING_PAGE_TITLE}</h1>
      </header>
      {/* useSearchParams(탭 상태)가 Suspense 경계를 요구한다. */}
      <Suspense fallback={null}>
        <SwingScreenerContainer />
      </Suspense>
    </div>
  );
}
