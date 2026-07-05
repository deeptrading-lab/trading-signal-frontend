/**
 * 공용 점검 안내(`MaintenanceNotice`)의 한글 카피 — 단일 위치(i18n 여지).
 *
 * PRD `market-status-aware-home` §3-3 / DESIGN R3. 실시간 순위(전탭 실패)·순매수 당일(unavailable)이
 * 공유한다. **장 마감이 아니라 데이터 점검/일시 장애** 톤 — ②`toss-market-calendar` 의 "장 마감 · 다음
 * 개장" 언어와 명확히 구분한다. **다음 개장 시각을 표기하지 않는다**(마감이 아니므로).
 */

/** 점검 안내 제목 — 중립, 경보 아님. */
export const MAINTENANCE_TITLE = "현재 점검 중이에요";
/** 보조 — 다음 개장 시각 없이 "기다리면 복구". */
export const MAINTENANCE_SUPPLEMENT = "잠시 후 다시 확인해 주세요";
/** 관리자 전용 재시도 버튼 라벨(전 프로브 refetch). */
export const MAINTENANCE_RETRY = "다시 시도";
/** 점검 안내 컨테이너 스크린리더 라벨. */
export const MAINTENANCE_ARIA = "데이터 점검 안내";
