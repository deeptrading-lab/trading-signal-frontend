import { describe, it, expect } from "vitest";
import { computePeekPosition } from "@/lib/utils/peekPosition";

const VIEWPORT = { width: 1280, height: 800 };
const PEEK = { width: 264, height: 232 };

describe("computePeekPosition", () => {
  it("여유 있는 위치 — 앵커 오른쪽(+18)·위(-26)에 붙고 플립 없음", () => {
    const pos = computePeekPosition({ x: 400, y: 300 }, VIEWPORT, PEEK);
    expect(pos).toEqual({ left: 418, top: 274, flippedX: false });
  });

  it("오른쪽 가장자리 — 넘치면 앵커 왼쪽으로 플립", () => {
    // x+18+264 = 1242 > 1280-10=1270? 아니오 → 플립 안 함. 더 오른쪽으로.
    const pos = computePeekPosition({ x: 1200, y: 300 }, VIEWPORT, PEEK);
    // 1200+18+264=1482 > 1270 → 플립: 1200-264-18 = 918
    expect(pos.flippedX).toBe(true);
    expect(pos.left).toBe(918);
  });

  it("좌측 클램프 — 플립해도 화면 밖이면 pad(10)로", () => {
    // 좁은 뷰포트 + 왼쪽 앵커: 오른쪽 넘침 → 플립 → 음수 → pad 클램프.
    const pos = computePeekPosition(
      { x: 40, y: 300 },
      { width: 320, height: 800 },
      PEEK,
    );
    // 40+18+264=322 > 320-10=310 → 플립: 40-264-18=-242 < 10 → 10
    expect(pos.flippedX).toBe(true);
    expect(pos.left).toBe(10);
  });

  it("하단 클램프 — 아래로 넘치면 viewport-height-pad 로 끌어올림", () => {
    const pos = computePeekPosition({ x: 400, y: 790 }, VIEWPORT, PEEK);
    // top = 790-26 = 764; 764+232=996 > 800-10=790 → top = 800-232-10 = 558
    expect(pos.top).toBe(558);
  });

  it("상단 클램프 — 헤더 아래(topMin) 밑으로 내려가지 않음", () => {
    const pos = computePeekPosition({ x: 400, y: 20 }, VIEWPORT, PEEK, {
      topMin: 64,
    });
    // top = 20-26 = -6 < 64 → 64
    expect(pos.top).toBe(64);
  });

  it("옵션 오버라이드 — offsetX/offsetY 반영", () => {
    const pos = computePeekPosition({ x: 400, y: 300 }, VIEWPORT, PEEK, {
      offsetX: 0,
      offsetY: 0,
    });
    expect(pos).toEqual({ left: 400, top: 300, flippedX: false });
  });
});
