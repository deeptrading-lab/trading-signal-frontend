import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ readFile: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), chmod: vi.fn(), post: vi.fn(), get: vi.fn() }));
vi.mock("node:fs/promises", () => mocks);
vi.mock("../kisTransport",()=>({getSharedTransport:()=>({request:mocks.get})}));
import { connectProgramAccount, getProgramAccount, validateAccountInput } from "../account";
const input = { accountNumber: "12345678", accountProductCode: "01", environment: "prod" as const, appKey: "test_key_1234", appSecret: "test_secret_1234" };
beforeEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); mocks.readFile.mockResolvedValue("EXISTING_VALUE=keep\n"); mocks.post.mockResolvedValue({ data: { access_token: "test_token", expires_in: 86400 } }); mocks.get.mockResolvedValue({ data: { rt_cd: "0", output2: [{ tot_evlu_amt: "12000", dnca_tot_amt: "9000" }] } }); });
describe("local KIS account verification", () => {
  it("rejects malformed account and secret injection", () => {
    expect(validateAccountInput(input)).toBe(true);
    expect(validateAccountInput({ ...input, accountNumber: 12345678 })).toBe(false);
    expect(validateAccountInput({ ...input, appSecret: 'secret\nKIS_ENV=prod' })).toBe(false);
    expect(validateAccountInput({ ...input, environment: "other" })).toBe(false);
  });
  it("verifies real balance but exposes only a masked read-only account", async () => {
    const status = await connectProgramAccount(input);
    expect(status).toMatchObject({ connected: true, maskedAccount: "****5678-01", totalEquity: 12000, cash: 9000, executionMode: "prod" });
    expect(JSON.stringify(status)).not.toContain(input.appSecret);
    expect(mocks.get).toHaveBeenCalledWith("/uapi/domestic-stock/v1/trading/inquire-balance", "TTTC8434R", expect.objectContaining({ CANO: "12345678" }));
    expect(mocks.writeFile).toHaveBeenCalledWith(".env.local.program-tmp", expect.stringContaining("EXISTING_VALUE=keep"), { mode: 0o600 });
    expect(mocks.rename).toHaveBeenCalledWith(".env.local.program-tmp", ".env.local");
  });
  it("does not save rejected credentials or fabricate a balance", async () => {
    mocks.get.mockResolvedValue({ data: { rt_cd: "1", msg1: input.appSecret } });
    await expect(connectProgramAccount(input)).rejects.toThrow("account verification failed");
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });
  it("rejects incomplete numeric balance rather than coercing blank to zero", async () => {
    mocks.get.mockResolvedValue({ data: { rt_cd: "0", output2: [{ tot_evlu_amt: "", dnca_tot_amt: "9000" }] } });
    await expect(connectProgramAccount(input)).rejects.toThrow();
    expect(mocks.rename).not.toHaveBeenCalled();
  });
  it("missing credentials stay disconnected", async () => {
    vi.stubEnv("KIS_APP_KEY", ""); vi.stubEnv("KIS_APP_SECRET", ""); vi.stubEnv("KIS_ACCOUNT_NO", "");
    expect(await getProgramAccount()).toMatchObject({ connected: false, totalEquity: null });
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
