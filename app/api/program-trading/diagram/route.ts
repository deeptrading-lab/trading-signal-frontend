import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const view = request.nextUrl.searchParams.get("view");
  if (view !== "summary" && view !== "detail") return NextResponse.json({ error: "다이어그램을 선택해 주세요." }, { status: 400 });
  try {
    const source = await readFile(`${process.cwd()}/docs/program-trading/${view}.html`, "utf8");
    // Escape in the sandboxed viewer cannot bubble to the modal document.
    const bridge = `<script>window.addEventListener("keydown",function(event){if(event.key==="Escape"&&window.parent!==window){window.parent.postMessage({type:"program-trading:diagram-close"},"*");}},true);</script>`;
    const html = source.replace("</body>", `${bridge}</body>`);
    // Only scripts embedded in this generated artifact may execute; no remote scripts or connections.
    const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
      .map(([, script]) => `'sha256-${createHash("sha256").update(script).digest("base64")}'`);
    return new NextResponse(html, { headers: {
      "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
      "Content-Security-Policy": `default-src 'none'; script-src ${hashes.join(' ') || "'none'"}; style-src 'unsafe-inline'; img-src data: blob:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'`,
    } });
  } catch { return NextResponse.json({ error: "다이어그램을 생성해 주세요." }, { status: 503 }); }
}
