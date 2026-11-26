/** 로컬 모의매매 전용 지속 키. 앱의 Google 로그인 세션과 독립적이다. */
export const PROGRAM_BROWSER_COOKIE = "program_browser_key";
export const PROGRAM_BROWSER_MAX_AGE = 365 * 24 * 60 * 60;

export function isProgramBrowserKey(key: string | undefined): key is string {
  return typeof key === "string" && /^[a-f0-9]{64}$/.test(key);
}

export function createProgramBrowserKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
}
