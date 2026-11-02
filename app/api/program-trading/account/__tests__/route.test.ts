import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const account = vi.hoisted(() => ({ connectProgramAccount: vi.fn(),post: vi.fn(), get: vi.fn(), getProgramAccount: vi.fn(), validateAccountInput: vi.fn() }));
vi.mock("@/lib/server/programTrading/account", () => account);
vi.mock("axios",()=>({default:{post:account.post,get:account.get}}));
import { POST, GET } from "../route";
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL", ""); vi.stubEnv("VERCEL_ENV", undefined); vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", undefined); });
function request(body: string, origin = "http://localhost:3000") { return new NextRequest("http://localhost:3000/api/program-trading/account", { method: "POST", body, headers: { origin, host: "localhost:3000" } }); }
describe("account BFF boundary", () => {
  it("rejects foreign origin before credentials are inspected", async () => {
    expect((await POST(request("{}", "https://other.example"))).status).toBe(403);
    expect(account.connectProgramAccount).not.toHaveBeenCalled();
  });
  it("limits streamed input even without content length", async () => {
    expect((await POST(request(" ".repeat(4097)))).status).toBe(413);
    expect(account.validateAccountInput).not.toHaveBeenCalled();
  });
  it("returns an actionable error without upstream credentials", async () => {
    account.validateAccountInput.mockReturnValue(true);
    account.post.mockRejectedValue(new Error("appSecret=do-not-expose"));
    const response = await POST(request("{}"));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("do-not-expose");
  });
  it("disables the account endpoint in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await GET(new NextRequest("http://localhost:3000/api/program-trading/account"))).status).toBe(403);
    expect(account.getProgramAccount).not.toHaveBeenCalled();
  });
});
