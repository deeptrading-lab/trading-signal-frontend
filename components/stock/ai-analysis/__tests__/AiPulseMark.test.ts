/**
 * AiPulseMark 렌더 회귀 — svg + 2 polyline(트랙·스파크) + gradient def, 좌→우 스윕 좌표,
 * calm 변형, aria-hidden 을 고정한다.
 *
 * 프로젝트에 jsdom/testing-library 가 없고 vitest 환경이 node 이므로, DOM 없이 동작하는
 * `react-dom/server` 의 `renderToStaticMarkup` 으로 HTML 문자열을 만들어 검증한다(신규 의존성 0,
 * 기존 `**\/*.test.ts` glob 정합). JSX 없이 `createElement` 사용 → 파일은 `.test.ts` 유지.
 */

import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiPulseMark } from "../AiPulseMark";

function render(props: Parameters<typeof AiPulseMark>[0]): string {
  return renderToStaticMarkup(createElement(AiPulseMark, props));
}

describe("AiPulseMark", () => {
  it("svg + polyline 2개(트랙·스파크) + gradient def 를 렌더한다", () => {
    const html = render({ gradientId: "testPulse" });
    expect(html).toContain("<svg");
    expect(html.match(/<polyline/g) ?? []).toHaveLength(2);
    expect(html).toContain("<linearGradient");
    expect(html).toContain('id="testPulse"');
    // 스파크는 gradient stroke 를, 트랙은 border-line 토큰 stroke 를 참조.
    expect(html).toContain('stroke="url(#testPulse)"');
    expect(html).toContain("stroke-border-line");
  });

  it("좌→우 스윕을 위해 점 순서를 뒤집는다(양 polyline 동일 좌표)", () => {
    const html = render({ gradientId: "x" });
    const reversed = "2 12 6 12 9 3 15 21 18 12 22 12";
    expect(html.split(reversed)).toHaveLength(3); // 2회 등장 → split 조각 3개
    // 원본(우→좌) 순서는 남지 않는다.
    expect(html).not.toContain("22 12 18 12 15 21 9 3 6 12 2 12");
  });

  it("장식 요소 — aria-hidden", () => {
    expect(render({ gradientId: "y" })).toContain('aria-hidden="true"');
  });

  it("calm 상태에서만 is-calm 수식 클래스를 붙인다", () => {
    expect(render({ gradientId: "c", state: "calm" })).toContain("is-calm");
    expect(render({ gradientId: "a", state: "active" })).not.toContain("is-calm");
    expect(render({ gradientId: "d" })).not.toContain("is-calm"); // 기본 active
  });
});
