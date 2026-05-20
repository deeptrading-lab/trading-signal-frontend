/**
 * 화이트리스트 검색 클라이언트.
 *
 * Next.js route handler `/api/whitelist/search` 를 거쳐 FastAPI 와 통신한다.
 */

import { httpClient } from "@/lib/api/client";
import type {
  WhitelistItem,
  WhitelistSearchResponse,
} from "@/lib/types/whitelist";

/**
 * 키워드(`q`) 로 화이트리스트를 검색해 종목 목록을 돌려준다.
 *
 * @param q 사용자 입력 키워드. 빈 문자열도 허용 (BE 가 전체를 돌려준다).
 */
export async function searchWhitelist(q: string): Promise<WhitelistItem[]> {
  const response = await httpClient.get<WhitelistSearchResponse>(
    "/whitelist/search",
    {
      params: { q },
    },
  );
  return response.data.results ?? [];
}
