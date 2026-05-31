"use client";

import { useEffect, useState } from "react";

/**
 * ⚠️ 임시 진단 전용 — 머지/유지 금지. 스플래시 로고 수직 정렬 보정을 위해, 설치형 PWA(standalone)에서
 * 안드로이드가 상태바를 웹에 어떻게 노출하는지(safe-area-inset 값/뷰포트-화면 관계)를 화면에 표시한다.
 * 측정 후 즉시 제거하고 실제 보정(SplashScreen/.splash-*)으로 대체한다.
 */
export function SafeAreaDebug() {
  const [lines, setLines] = useState<string[]>(["measuring…"]);

  useEffect(() => {
    // env(safe-area-inset-*) 실측 — 높이로 환산해 읽는다.
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;width:1px;height:env(safe-area-inset-top)";
    document.body.appendChild(probe);
    const safeTop = probe.getBoundingClientRect().height;
    probe.style.height = "env(safe-area-inset-bottom)";
    const safeBottom = probe.getBoundingClientRect().height;
    document.body.removeChild(probe);

    const w = window as unknown as { screenY?: number; screenTop?: number };
    setLines([
      `safe-top: ${safeTop}`,
      `safe-bottom: ${safeBottom}`,
      `innerH: ${window.innerHeight}`,
      `screenH: ${window.screen.height}`,
      `availH: ${window.screen.availHeight}`,
      `screenY: ${w.screenY ?? w.screenTop ?? "?"}`,
      `dpr: ${window.devicePixelRatio}`,
      `standalone: ${window.matchMedia("(display-mode: standalone)").matches}`,
    ]);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: "34%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        background: "rgba(0,0,0,0.85)",
        color: "#22ff88",
        fontSize: 15,
        lineHeight: 1.55,
        padding: "12px 16px",
        fontFamily: "monospace",
        borderRadius: 10,
        whiteSpace: "pre",
        textAlign: "left",
      }}
    >
      {lines.join("\n")}
    </div>
  );
}
