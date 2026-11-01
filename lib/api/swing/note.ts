/**
 * Swing 도메인 어댑터 — 스윙 체크 AI 노트(뉴스·공시 정리) 조회·요청. BFF `/api/swing/note/[ticker]`.
 */

import { httpClient } from "@/lib/api/client";
import type { SwingNoteResponse } from "@/lib/types/swing/api";

export async function fetchSwingNote(ticker: string): Promise<SwingNoteResponse> {
  const response = await httpClient.get<SwingNoteResponse>(`/swing/note/${encodeURIComponent(ticker)}`);
  return response.data;
}

export async function requestSwingNote(ticker: string): Promise<SwingNoteResponse> {
  const response = await httpClient.post<SwingNoteResponse>(`/swing/note/${encodeURIComponent(ticker)}`);
  return response.data;
}
