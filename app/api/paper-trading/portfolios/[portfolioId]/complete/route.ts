import { NextResponse, type NextRequest } from "next/server";
import { requireProdAdminApi } from "@/lib/server/auth/apiGuard";
import { completePaperTradingPortfolio } from "@/lib/server/paperTrading/sessionStore";
import type { CompletePaperTradingPortfolioResponse } from "@/lib/types/paperTrading/paperTrading";

type RouteContext = { params: Promise<{ portfolioId: string }> };

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  const { portfolioId } = await context.params;
  try {
    const result = await completePaperTradingPortfolio(portfolioId);
    if (!result) {
      return NextResponse.json(
        { error: "종료할 자동 포트폴리오를 찾지 못했어요." },
        { status: 404 },
      );
    }
    const payload: CompletePaperTradingPortfolioResponse = result;
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "자동 포트폴리오를 종료하지 못했어요.",
      },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
}
