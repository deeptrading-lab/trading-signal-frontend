import { NextRequest } from "next/server";
import { downloadProgramFile } from "@/lib/server/programTrading/download";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) { return downloadProgramFile(request, "review"); }
