/**
 * FastAPI 백엔드 어댑터.
 *
 * 기존 `app/api/workbench/analyze/route.ts` 의 `fetch(fastapi)` 로직을 1:1 옮긴 구현이다.
 * PRD `claude-cli-analysis` AC-1 (fastapi 모드 무회귀) — 기본 모드는 본 어댑터가 처리한다.
 *
 * - `FASTAPI_BASE_URL` 환경변수 사용 (기본 `http://127.0.0.1:8000`).
 * - timeout 30초 (`AbortSignal.timeout`).
 * - 응답 본문은 그대로 통과시킨다. 4xx/5xx 시 BE body 를 그대로 사용 (route handler 가 흘려보냄).
 * - 네트워크 단절/타임아웃/JSON parse 실패 시 한글 폴백 메시지.
 */

import type {
  AnalyzeRequest,
  AnalyzeResponse,
} from "@/lib/types/workbench/analyze";

import type { AdapterResult, AnalyzeAdapter } from "./types";

const TIMEOUT_MS = 30_000;

const FALLBACK_NETWORK_MESSAGE =
  "엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요.";
const FALLBACK_PARSE_MESSAGE =
  "엔진 응답 처리에 실패했어요. 잠시 후 다시 시도해 주세요.";

export class FastapiAdapter implements AnalyzeAdapter {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ?? process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";
  }

  async analyze(input: AnalyzeRequest): Promise<AdapterResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/workbench/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return { ok: false, status: 502, error: FALLBACK_NETWORK_MESSAGE };
    }

    return this.normalize(response);
  }

  private async normalize(response: Response): Promise<AdapterResult> {
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      let text = "";
      try {
        text = await response.text();
      } catch {
        return { ok: false, status: 500, error: FALLBACK_PARSE_MESSAGE };
      }
      if (text.trim() === "") {
        return {
          ok: false,
          status: response.status >= 400 ? response.status : 500,
          error: FALLBACK_PARSE_MESSAGE,
        };
      }
      // BE 가 JSON 외 본문을 돌려준 비정상 케이스 — 폴백 메시지로 흡수.
      return {
        ok: false,
        status: response.status >= 400 ? response.status : 500,
        error: FALLBACK_PARSE_MESSAGE,
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, status: 500, error: FALLBACK_PARSE_MESSAGE };
    }

    if (response.status >= 400) {
      // BE 가 JSON 으로 에러를 돌려준 경우 — 본문에서 한글 메시지를 뽑아 흘려보낸다.
      const message = extractErrorMessage(payload) ?? FALLBACK_NETWORK_MESSAGE;
      return { ok: false, status: response.status, error: message };
    }

    return { ok: true, status: 200, data: payload as AnalyzeResponse };
  }
}

function extractErrorMessage(data: unknown): string | null {
  if (typeof data === "string" && data.trim() !== "") return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.error === "string") return record.error;
    if (typeof record.detail === "string") return record.detail;
    if (Array.isArray(record.detail) && record.detail.length > 0) {
      const first = record.detail[0] as Record<string, unknown> | undefined;
      if (first && typeof first.msg === "string") return first.msg;
    }
    if (typeof record.message === "string") return record.message;
  }
  return null;
}
