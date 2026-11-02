import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { GET } from "../route";

vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));
const file = vi.mocked(readFile);
beforeEach(() => vi.clearAllMocks());
describe("자동매매 다이어그램", () => {
  it("허용한 보기만 읽는다", async () => {
    expect((await GET(new NextRequest("http://localhost/api/program-trading/diagram?view=../secret"))).status).toBe(400);
    expect(file).not.toHaveBeenCalled();
  });
  it("생성 HTML의 정확한 스크립트 해시만 허용한다", async () => {
    const script = "document.body.dataset.ready = 'true';";
    const html = `<html><script>${script}</script></html>`;
    file.mockResolvedValue(html);
    const response = await GET(new NextRequest("http://localhost/api/program-trading/diagram?view=summary"));
    const csp = response.headers.get("Content-Security-Policy")!;
    expect(csp).toContain(`script-src 'sha256-${createHash("sha256").update(script).digest("base64")}'`);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toContain("script-src 'unsafe-inline'");
    expect(await response.text()).toBe(html);
  });
  it("스크립트가 없으면 실행을 허용하지 않는다", async () => {
    file.mockResolvedValue("<html>diagram</html>");
    const response = await GET(new NextRequest("http://localhost/api/program-trading/diagram?view=detail"));
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src 'none'");
  });
  it("iframe 안의 Escape를 모달에 알리는 스크립트도 해시로 허용한다", async () => {
    file.mockResolvedValue("<html><body>diagram</body></html>");
    const response = await GET(new NextRequest("http://localhost/api/program-trading/diagram?view=summary"));
    const html = await response.text();
    const bridge = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(bridge).toContain('program-trading:diagram-close');
    expect(response.headers.get("Content-Security-Policy")).toContain(`'sha256-${createHash("sha256").update(bridge!).digest("base64")}'`);
  });
  it("생성 파일이 없으면 재생성 안내를 준다", async () => {
    file.mockRejectedValue(new Error("ENOENT"));
    expect((await GET(new NextRequest("http://localhost/api/program-trading/diagram?view=summary"))).status).toBe(503);
  });
});
