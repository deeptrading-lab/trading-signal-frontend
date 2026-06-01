/**
 * BFF route handler 공통 유틸.
 *
 * `app/api/**\/route.ts` 여러 곳에 동일 구현으로 중복돼 있던 헬퍼를 단일화한다.
 * 도메인별로 문구가 갈리는 `FALLBACK_TIMEOUT_MESSAGE`(KIS / OpenDART 등)는
 * 의도적으로 각 route 로컬에 남긴다 — 공용으로 묶으면 도메인 카피가 뭉개진다.
 */

import { NextResponse } from "next/server";

/** `withTimeout` 이 타임아웃 시 던지는 Error 메시지 — route 의 에러 분기 비교에 사용. */
export const BFF_TIMEOUT_SENTINEL = "__BFF_TIMEOUT__";

/**
 * `promise` 와 `ms` 타임아웃을 race 한다. 타임아웃 시 `Error(BFF_TIMEOUT_SENTINEL)` reject.
 * 타이머는 finally 에서 정리해 누수를 막는다.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(BFF_TIMEOUT_SENTINEL)), ms);
  });
  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** 단순 지연 — 외부 API 청크 호출 간 간격(EGW00201 회피) 등에 사용. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `X-Data-Source` 헤더(`kis`/`mock`/`seed`/`mock-timeout` 등)와 `Cache-Control: no-store`
 * 를 붙인 200 JSON 응답을 만든다.
 */
export function jsonWithDataSource(
  data: unknown,
  source: string,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(data, {
    status: 200,
    headers: {
      "X-Data-Source": source,
      "Cache-Control": "no-store",
      ...(extraHeaders ?? {}),
    },
  });
}
