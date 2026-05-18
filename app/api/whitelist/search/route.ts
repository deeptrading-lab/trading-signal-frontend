import { NextRequest, NextResponse } from "next/server";

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const response = await fetch(
    `${FASTAPI_BASE_URL}/api/whitelist/search?q=${encodeURIComponent(query)}`,
    { cache: "no-store" },
  );
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
