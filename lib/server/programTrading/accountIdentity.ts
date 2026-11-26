import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { isProgramBrowserKey, PROGRAM_BROWSER_COOKIE } from "@/lib/auth/programBrowser";
import { allowsLocalProgram } from "./localRequest";

export function programBrowserAccount(key: string | undefined): string | null {
  if (!isProgramBrowserKey(key)) return null;
  return `browser:${createHash("sha256").update(key).digest("hex")}`;
}

export async function readProgramAccount(request: NextRequest): Promise<string | null> {
  if (!allowsLocalProgram(request, request.method === "POST")) return null;
  return programBrowserAccount(request.cookies.get(PROGRAM_BROWSER_COOKIE)?.value);
}
