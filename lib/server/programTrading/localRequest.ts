import type { NextRequest } from "next/server";
import { isVercelEnv } from "@/lib/server/env";

export function allowsLocalProgramHost(host: string | null): boolean {
  return !isVercelEnv() && process.env.NODE_ENV === "development" &&
    /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host ?? "");
}

export function allowsLocalProgram(request: NextRequest, mutation = false): boolean {
  const host = request.headers.get("host");
  if (!allowsLocalProgramHost(host)) return false;
  const hostname = request.nextUrl.hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return false;
  if (mutation && request.headers.get("origin") !== `${request.nextUrl.protocol}//${host}`) return false;
  return true;
}
