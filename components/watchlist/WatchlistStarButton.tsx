"use client";

/**
 * WatchlistStarButton — 검색 결과 행의 관심종목 추가/제거 별 토글.
 *
 * 빈 별(outline) ↔ 채운 별(filled, 앰버/골드) + 추가 시 파티클 축하(uiverse 참고, CSS 는 `.wl-star*`).
 *   - `added`(= `hasTicker`)로 제어되는 checkbox → 이미 추가된 종목은 채운 별로 렌더(자동 발화 없음).
 *   - **추가 클릭(빈→채움)에서만** `.is-celebrating` 으로 팝+파티클 발화(약 0.9s) 후 해제.
 *   - 제거 클릭(채움→빈)은 파티클 없이 채움만 사라진다(토글).
 *
 * 색·애니메이션은 전부 `app/components.css` 의 `.wl-star*`(토큰 chart-signal). 본 컴포넌트는 마크업+상태만.
 * 별은 검색 컨테이너 내부라, 바깥 클릭 닫힘(mousedown) 대상이 아니다 → 클릭해도 드롭다운 유지.
 */

import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  WATCHLIST_STAR_ADD,
  WATCHLIST_STAR_REMOVE,
} from "@/lib/copy/watchlist/labels";

const CELEBRATE_MS = 900;

const OUTLINE_PATH =
  "M12 2.5L9.45 8.5L3 9.06L7.725 13.39L6.25 19.82L12 16.5L17.75 19.82L16.275 13.39L21 9.06L14.55 8.5L12 2.5ZM12 4.75L14 9.33L18.7 9.75L15 13.07L16.18 17.75L12 15.16L7.82 17.75L9 13.07L5.3 9.75L10 9.33L12 4.75Z";
const FILLED_PATH =
  "M12 2.5L9.45 8.5L3 9.06L7.725 13.39L6.25 19.82L12 16.5L17.75 19.82L16.275 13.39L21 9.06L14.55 8.5L12 2.5Z";
const PARTICLES = [0, 1, 2, 3, 4, 5, 6, 7];

export interface WatchlistStarButtonProps {
  /** 이미 관심종목인지 — 채운 별/빈 별 결정. */
  added: boolean;
  /** 토글 — 추가(빈→채움) 또는 제거(채움→빈). */
  onToggle: () => void;
}

export function WatchlistStarButton({
  added,
  onToggle,
}: WatchlistStarButtonProps) {
  const [celebrating, setCelebrating] = useState(false);
  const timerRef = useRef<number | null>(null);

  const label = added ? WATCHLIST_STAR_REMOVE : WATCHLIST_STAR_ADD;

  function handleChange() {
    const willAdd = !added;
    onToggle();
    if (willAdd) {
      // 추가 순간에만 파티클 축하 — 약 0.9s 후 해제(이미 추가된 항목 렌더 시엔 발화 안 됨).
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setCelebrating(true);
      timerRef.current = window.setTimeout(
        () => setCelebrating(false),
        CELEBRATE_MS,
      );
    }
  }

  return (
    <label className={cn("wl-star", celebrating && "is-celebrating")} title={label}>
      <input
        type="checkbox"
        className="wl-star-check"
        checked={added}
        aria-label={label}
        onChange={handleChange}
      />
      <span className="wl-star-svg-wrap" aria-hidden="true">
        <svg
          className="wl-star-outline"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path d={OUTLINE_PATH} />
        </svg>
        <svg
          className="wl-star-filled"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path d={FILLED_PATH} />
        </svg>
        <svg
          className="wl-star-celebrate"
          xmlns="http://www.w3.org/2000/svg"
          height="100"
          width="100"
        >
          {PARTICLES.map((i) => (
            <circle key={i} className="wl-star-particle" r="2" cy="50" cx="50" />
          ))}
        </svg>
      </span>
    </label>
  );
}
