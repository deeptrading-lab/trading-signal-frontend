import type { NextRequest } from "next/server";
import { isVercelEnv } from "@/lib/server/env";
export function allowsLocalProgram(request: NextRequest, mutation = false): boolean {
  if (isVercelEnv() || process.env.NODE_ENV !== "development") return false;
  const hostname = request.nextUrl.hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return false;
  if (mutation && request.headers.get("origin") !== `${request.nextUrl.protocol}//${request.headers.get("host")}`) return false;
  return true;
}
