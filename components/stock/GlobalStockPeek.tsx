"use client";

import {
  useStockPeekActions,
  useStockPeekState,
} from "@/hooks/stock/peekProvider";
import { useMediaQuery } from "@/hooks/utils/useMediaQuery";
import {
  StockPeekPopover,
  StockPeekSheet,
  StockPeekDock,
} from "@/components/stock/peekDynamic";

/**
 * 우측 도킹 게이트 — 홈 콘텐츠(1152px) 우측에 도크 패널(≈248px)이 겹침 없이 들어갈 만큼 여백이
 * 생기는 초광폭에서만 매칭. 사이드바 확장(208px) 최악 기준으로 잡아 이 폭 아래에선 팝오버를 쓴다:
 *   여백 = (vw − 208 − 1152) / 2 ≥ 248 + 여유  →  vw ≳ 1920.
 * 접힌 사이드바(76)면 더 좁은 폭에서도 여유가 있으나, 단일 임계로 예측 가능하게 고정한다.
 */
const PEEK_DOCK_QUERY = "(min-width: 1920px)";

/**
 * GlobalStockPeek — Peek 오버레이의 전역 호스트. `(main)` 레이아웃에 1회 mount.
 *
 * 활성 Peek(단일)을 받아 hover(팝오버 또는 초광폭 우측 도크) 또는 롱프레스(시트)를 렌더한다.
 * 상태를 셸에 두어 어느 화면(홈·관심·검색)에서 소환하든 같은 오버레이 하나로 처리한다.
 *
 * ## hover 배치 — 팝오버 vs 우측 도크
 * `mode === "popover"`(마우스 hover/포커스)일 때, 콘텐츠 우측에 여백이 넉넉한 초광폭이면 커서를
 * 쫓지 않는 **고정 도크 패널**(더 큰 차트)로, 아니면 기존 커서 앵커 팝오버로 렌더한다. 판정은
 * `useMediaQuery(PEEK_DOCK_QUERY)`(뷰포트 폭) — 여백 없는 일반 노트북은 팝오버 유지.
 *
 * ## 코드 스플리팅(mobile-perf 정합)
 * 팝오버/도크/시트는 `MiniStockChart`(→ recharts)를 끌어오므로, Peek 이 실제로 열릴 때만 필요하다.
 * 지연 로드 정의는 `peekDynamic` 에 두어 recharts 가 셸 청크에서 빠지고, Peek 을 한 번도 소환하지
 * 않은 라우트에서는 로드되지 않는다(첫 hover 지연은 `preloadPeekChunk` 유휴 워밍으로 흡수).
 */

export function GlobalStockPeek() {
  const peek = useStockPeekState();
  const actions = useStockPeekActions();
  // 훅은 조기 return 전 항상 호출(rules of hooks).
  const canDock = useMediaQuery(PEEK_DOCK_QUERY);
  if (!peek || !actions) return null;

  if (peek.mode === "popover") {
    return canDock ? (
      <StockPeekDock target={peek} />
    ) : (
      <StockPeekPopover target={peek} onHide={actions.hidePopover} />
    );
  }
  return <StockPeekSheet target={peek} onClose={actions.close} />;
}
