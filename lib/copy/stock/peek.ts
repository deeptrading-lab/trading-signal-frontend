/**
 * 글로벌 Peek(차트 미리보기) 한글 카피 — hover 팝오버 / 롱프레스 시트 공용.
 *
 * "차트 어디서든"(T3) — 종목 참조 행에서 상세 진입 없이 미니 차트를 소환하는 지면의 문구.
 * i18n 여지로 `lib/copy/` 에 둔다(도메인=stock).
 */

/** 차트 종류 라벨(간이 표기). */
export const PEEK_CHART_LABEL = "일봉";
/** 데스크탑 팝오버 하단 안내 — 행 클릭으로 상세 진입 가능함을 알림. */
export const PEEK_HINT_DESKTOP = "클릭하면 상세로 이동";
/** 시세 조회 실패 시 문구(차트/가격 공용 톤). */
export const PEEK_PRICE_ERROR = "시세를 불러오지 못했어요";
/** 모바일 시트 닫기 버튼 aria. */
export const PEEK_SHEET_CLOSE = "닫기";
/** 모바일 시트 상세 진입 CTA. */
export const PEEK_SHEET_CTA = "상세 보기";
/** 팝오버/시트 컨테이너 aria-label — `{종목명} 미리보기`. */
export const PEEK_ARIA = (name: string) => `${name} 미리보기`;
