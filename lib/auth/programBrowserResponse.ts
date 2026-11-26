import { NextRequest, NextResponse } from "next/server";
import { createProgramBrowserKey, isProgramBrowserKey, PROGRAM_BROWSER_COOKIE, PROGRAM_BROWSER_MAX_AGE } from "./programBrowser";

export function programBrowserResponse(request: NextRequest) {
  const previous = request.cookies.get(PROGRAM_BROWSER_COOKIE)?.value;
  const key = isProgramBrowserKey(previous) ? previous : createProgramBrowserKey();
  const headers = new Headers(request.headers);
  const cookies = request.cookies.getAll().filter(cookie => cookie.name !== PROGRAM_BROWSER_COOKIE);
  headers.set("cookie", [...cookies.map(cookie => `${cookie.name}=${cookie.value}`), `${PROGRAM_BROWSER_COOKIE}=${key}`].join("; "));
  // 최초 복기 페이지의 서버 렌더링에서도 응답에 발급할 키와 같은 키를 읽는다.
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(PROGRAM_BROWSER_COOKIE, key, {
    httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:",
    path: "/", maxAge: PROGRAM_BROWSER_MAX_AGE,
  });
  return response;
}
