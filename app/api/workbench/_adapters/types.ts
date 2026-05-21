/**
 * Workbench analyze BFF adapter 인터페이스.
 *
 * PRD `claude-cli-analysis` §3.4 / AC-8 — 분석 호출 경로를 어댑터로 추상화한다.
 * `app/api/workbench/analyze/route.ts` dispatcher 가 환경변수 (`ANALYZE_BACKEND`) 에 따라
 * `fastapiAdapter` 또는 `claudeCliAdapter` 를 선택해 호출한다.
 *
 * Next.js App Router 컨벤션상 `_` prefix 디렉터리는 라우트화되지 않으므로
 * route handler 내부 helper 로서의 위치가 명확하다.
 */

import type {
  AnalyzeRequest,
  AnalyzeResponse,
} from "@/lib/types/workbench/analyze";

/**
 * adapter 결과 — 성공 시 6블록을 담은 `AnalyzeResponse`,
 * 실패 시 BFF route handler 가 그대로 클라이언트에 흘려보낼 상태 + 한글 메시지.
 *
 * adapter 는 절대 throw 하지 않는다 — 실패도 status/error 로 normalize.
 * route handler 단의 catch 는 unexpected 예외 (코드 버그) 만 흡수한다.
 */
export type AdapterResult =
  | { ok: true; status: 200; data: AnalyzeResponse }
  | { ok: false; status: number; error: string };

export interface AnalyzeAdapter {
  analyze(input: AnalyzeRequest): Promise<AdapterResult>;
}

/**
 * 백엔드 모드 enum. `ANALYZE_BACKEND` 환경변수 값과 1:1.
 * 빈 값/오타는 dispatcher 에서 `fastapi` 로 폴백.
 */
export type AnalyzeBackend = "fastapi" | "claude-cli";
