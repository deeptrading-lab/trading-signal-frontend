/**
 * Swing 도메인 어댑터 — 운영자 전진 관찰(사후 성적). BFF `/api/swing/forward`(admin).
 */

import { httpClient } from "@/lib/api/client";
import type { SwingForwardResponse } from "@/lib/types/swing/api";

export async function fetchSwingForward(): Promise<SwingForwardResponse> {
  const response = await httpClient.get<SwingForwardResponse>("/swing/forward");
  return response.data;
}
