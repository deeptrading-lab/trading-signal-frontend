/**
 * computePeekPosition — 커서(또는 포커스 앵커) 기준 배치 + 뷰포트 클램프 좌표 계산(순수).
 *
 * ## "빈 여백에 떠 있는" 버그 회피
 * 팝오버를 고정 컨테이너·행 좌측 같은 정적 기준에 붙이면 넓은 화면에서 시선과 동떨어진 빈
 * 여백에 떠 버린다. 이를 막으려고 노스스타 목업 `showPeek(row, mx, my)` 처럼 **앵커(커서)
 * 바로 옆**에 붙인 뒤 뷰포트 안으로 클램프한다:
 *   1. 기본은 앵커 오른쪽(offsetX)에 배치 → 시선 근처.
 *   2. 오른쪽으로 넘치면 앵커 왼쪽으로 뒤집는다(flip) → 화면 밖으로 새지 않음.
 *   3. 좌/우/하단은 pad, 상단은 topMin(헤더 아래)으로 클램프.
 *
 * ## 순수 함수
 * DOM·window 를 참조하지 않는다. 호출측(StockPeekPopover)이 뷰포트 치수를 주입하므로
 * 노드 환경에서 그대로 단위 테스트할 수 있다(경계·플립·클램프 회귀 차단).
 */

export interface PeekAnchor {
  /** 앵커 X(뷰포트 기준 px) — 커서 clientX 또는 포커스 행 근처 점. */
  x: number;
  /** 앵커 Y(뷰포트 기준 px). */
  y: number;
}

export interface PeekBox {
  width: number;
  height: number;
}

export interface PeekPositionOptions {
  /** 앵커 대비 가로 오프셋(px). 기본 18(노스스타). */
  offsetX?: number;
  /** 앵커 대비 세로 오프셋(px, 위로). 기본 26(노스스타 my-26). */
  offsetY?: number;
  /** 뷰포트 가장자리 최소 여백(px). 기본 10. */
  pad?: number;
  /** 상단 최소 위치(px) — sticky 헤더 아래로 고정. 기본 56. */
  topMin?: number;
}

export interface PeekPosition {
  left: number;
  top: number;
  /** 오른쪽 넘침으로 앵커 왼쪽에 배치됐는지(플립 여부). */
  flippedX: boolean;
}

export function computePeekPosition(
  anchor: PeekAnchor,
  viewport: PeekBox,
  peek: PeekBox,
  options?: PeekPositionOptions,
): PeekPosition {
  const offsetX = options?.offsetX ?? 18;
  const offsetY = options?.offsetY ?? 26;
  const pad = options?.pad ?? 10;
  const topMin = options?.topMin ?? 56;

  // 1) 기본은 앵커 오른쪽.
  let left = anchor.x + offsetX;
  let flippedX = false;
  // 2) 오른쪽으로 넘치면 앵커 왼쪽으로 뒤집는다.
  if (left + peek.width > viewport.width - pad) {
    left = anchor.x - peek.width - offsetX;
    flippedX = true;
  }
  // 3) 뒤집어도 좌측으로 새면 pad 로 클램프.
  if (left < pad) left = pad;

  // 세로 — 앵커보다 offsetY 위에서 시작.
  let top = anchor.y - offsetY;
  // 하단 넘침 클램프.
  if (top + peek.height > viewport.height - pad) {
    top = viewport.height - peek.height - pad;
  }
  // 상단(헤더 아래) 클램프.
  if (top < topMin) top = topMin;

  return { left, top, flippedX };
}
