import { readFile, writeFile, rename, chmod } from "node:fs/promises";
import { getSharedTransport } from "./kisTransport";
import type { AccountInput, AccountStatus } from "@/lib/types/programTrading/programTrading";

const file = ".env.local";
const prefix = "PROGRAM_KIS_";
type Credentials = Required<AccountInput>;
let queue: Promise<unknown> = Promise.resolve();

async function settings(): Promise<Record<string, string>> {
  let content = "";
  try { content = await readFile(file, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const result: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^(PROGRAM_KIS_\w+)=(.*)$/);
    if (!match) continue;
    try { result[match[1]] = JSON.parse(match[2]); } catch { result[match[1]] = match[2]; }
  }
  return result;
}
export async function getProgramCredentials(input?: AccountInput): Promise<Credentials> {
  const saved = await settings();
  return {
    accountNumber: input?.accountNumber ?? saved[`${prefix}ACCOUNT_NO`] ?? process.env.KIS_ACCOUNT_NO ?? "",
    accountProductCode: input?.accountProductCode ?? saved[`${prefix}PRODUCT_CD`] ?? process.env.KIS_ACCOUNT_PRODUCT_CD ?? "01",
    environment: input?.environment ?? ((saved[`${prefix}ENV`] ?? process.env.KIS_ENV) === "prod" ? "prod" : "vts"),
    appKey: input?.appKey || saved[`${prefix}APP_KEY`] || process.env.KIS_APP_KEY || "",
    appSecret: input?.appSecret || saved[`${prefix}APP_SECRET`] || process.env.KIS_APP_SECRET || "",
  };
}
export function validateAccountInput(input: unknown): input is AccountInput {
  if (!input || typeof input !== "object") return false;
  const value = input as AccountInput;
  return typeof value.accountNumber === "string" && typeof value.accountProductCode === "string" && /^\d{8}$/.test(value.accountNumber) && /^\d{2}$/.test(value.accountProductCode) &&
    ["prod", "vts"].includes(value.environment) && [value.appKey, value.appSecret].every(
      secret => secret === undefined || (typeof secret === "string" && (secret === "" || /^[A-Za-z0-9+/=_-]{10,256}$/.test(secret))));
}
async function inspect(credentials: Credentials): Promise<AccountStatus> {
  if (!credentials.appKey || !credentials.appSecret || !/^\d{8}$/.test(credentials.accountNumber)) {
    return { connected: false, maskedAccount: null, environment: credentials.environment, totalEquity: null, cash: null, checkedAt: null, executionMode: credentials.environment, message: "계좌번호와 한투 Open API 키를 연결해 주세요." };
  }
  // Reuse the worker's authenticated transport; reconnect/start does not mint another token.
  const response = await getSharedTransport(credentials).request("/uapi/domestic-stock/v1/trading/inquire-balance", credentials.environment === "prod" ? "TTTC8434R" : "VTTC8434R", {
    CANO: credentials.accountNumber, ACNT_PRDT_CD: credentials.accountProductCode, AFHR_FLPR_YN: "N", OFL_YN: "", INQR_DVSN: "01", UNPR_DVSN: "01", FUND_STTL_ICLD_YN: "N", FNCG_AMT_AUTO_RDPT_YN: "N", PRCS_DVSN: "00", CTX_AREA_FK100: "", CTX_AREA_NK100: "",
  });
  const row = Array.isArray(response.data.output2) ? response.data.output2[0] : null;
  if (response.data.rt_cd !== "0" || !row || ![row.tot_evlu_amt, row.dnca_tot_amt].every((v: unknown) => typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))) throw new Error("account verification failed");
  return { connected: true, maskedAccount: `****${credentials.accountNumber.slice(-4)}-${credentials.accountProductCode}`, environment: credentials.environment, totalEquity: Number(row.tot_evlu_amt), cash: Number(row.dnca_tot_amt), checkedAt: new Date().toISOString(), executionMode: credentials.environment, message: "한투 잔액 조회 연결 완료 · 시작 버튼을 누르면 연결한 계좌 환경으로 주문해요." };
}
export async function getProgramAccount() {
  return inspect(await getProgramCredentials());
}
export function connectProgramAccount(input: AccountInput): Promise<AccountStatus> {
  const task = queue.then(async () => {
    const credentials = await getProgramCredentials(input);
    const status = await inspect(credentials);
    if (!status.connected) throw new Error("account verification failed");
    let content = "";
    try { content = await readFile(file, "utf8"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const values = { ACCOUNT_NO: credentials.accountNumber, PRODUCT_CD: credentials.accountProductCode, ENV: credentials.environment, APP_KEY: credentials.appKey, APP_SECRET: credentials.appSecret };
    const lines = content.split(/\r?\n/).filter(line => !/^PROGRAM_KIS_(ACCOUNT_NO|PRODUCT_CD|ENV|APP_KEY|APP_SECRET)=/.test(line));
    for (const [key, value] of Object.entries(values)) lines.push(`${prefix}${key}=${JSON.stringify(value)}`);
    const temp = `${file}.program-tmp`;
    try {
      await writeFile(temp, lines.join("\n") + "\n", { mode: 0o600 });
      await chmod(temp, 0o600);
      await rename(temp, file);
    } catch { throw new Error("account settings save failed"); }
    return status;
  });
  queue = task.catch(() => undefined);
  return task;
}
