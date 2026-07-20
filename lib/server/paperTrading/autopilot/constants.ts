/**
 * 오토파일럿 튜닝 상수 — 전부 env 오버라이드 가능(단타 conviction 컷의 무코드 튜닝 관례).
 *
 * 스크리너 임계·점수 가중치·로테이션 조건을 한 곳에 모아 라이브 캘리브레이션(관측 → env 조정 →
 * 재시작) 루프를 코드 수정 없이 돌린다. 값 근거는 각 상수 주석 참조.
 */

import { PAPER_TRADING_DEFAULT_INITIAL_CASH } from "@/lib/server/paperTrading/constants";

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

function envNumber(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseFloat(process.env[name] ?? "");
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

/** HH:MM env — 형식 밖이면 fallback(잘못된 값이 게이트를 무너뜨리지 않게). */
function envHhmm(name: string, fallback: string): string {
  const raw = process.env[name]?.trim() ?? "";
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : fallback;
}

// ─── 런 구성 ──────────────────────────────────────────────────────────────────

/** 기본 총자본 — 단일 세션 기본(1천만 원)과 동일한 예산을 슬롯들이 나눠 쓴다. */
export const AUTOPILOT_DEFAULT_TOTAL_CAPITAL = PAPER_TRADING_DEFAULT_INITIAL_CASH;

/** 기본 슬롯 수 — INTRADAY_TICK_CONCURRENCY 기본(3)과 정합(스케줄러 한 사이클에 전 슬롯 틱). */
export const AUTOPILOT_DEFAULT_SLOT_COUNT = envInt("AUTOPILOT_SLOT_COUNT", 3, 1, 5);
export const AUTOPILOT_MAX_SLOT_COUNT = 5;

// ─── 스윕 주기·창 ─────────────────────────────────────────────────────────────

/**
 * 스윕(스크리너+로테이션) 주기(분) — LLM 5분 틱 2회를 지켜본 뒤 판단하는 리듬. 60초 스케줄러
 * 사이클 안에서 창(floorToTickWindow) dedup 으로 이 주기를 지킨다.
 */
export const AUTOPILOT_SWEEP_INTERVAL_MINUTES = envInt(
  "AUTOPILOT_SWEEP_INTERVAL_MINUTES",
  10,
  5,
  30,
);

/** 첫 fill 허용 시각(KST) — 개장 직후 갭·노이즈 구간 회피(오프닝 레인지 형성 초입). */
export const AUTOPILOT_FIRST_FILL_HHMM = envHhmm("AUTOPILOT_FIRST_FILL_HHMM", "09:05");

/**
 * 신규 fill 마감 시각(KST) — 이후엔 빈 슬롯을 채우지도, 교체 회수하지도 않는다.
 * 기존 사후 게이트의 15:00 신규진입 금지보다 보수적(진입 후 관리 시간 확보).
 */
export const AUTOPILOT_NO_NEW_FILL_HHMM = envHhmm("AUTOPILOT_NO_NEW_FILL_HHMM", "14:00");

/** 스윕당 최대 fill 수 — 세션 생성=동기 첫 틱(CLI 2콜)이라 한 스윕에 몰지 않는다. */
export const AUTOPILOT_MAX_FILLS_PER_SWEEP = envInt("AUTOPILOT_MAX_FILLS_PER_SWEEP", 2, 1, 5);

// ─── 로테이션(교체) 조건 ──────────────────────────────────────────────────────

/** 1차 랭킹 이 순위 밖으로 밀리면 "스코어 탈락" 교체 대상(flat 슬롯 한정). */
export const AUTOPILOT_REPLACE_RANK_THRESHOLD = envInt(
  "AUTOPILOT_REPLACE_RANK_THRESHOLD",
  12,
  3,
  30,
);

/** 연속 무주문 틱 수(risk 틱 제외) — 5분 주기 기준 6틱 ≈ 30분 정체. */
export const AUTOPILOT_STAGNANT_TICKS = envInt("AUTOPILOT_STAGNANT_TICKS", 6, 2, 30);

/** 정체 판정의 conviction 상한 — 이보다 높으면 "진입 임박"으로 보고 교체 유예. */
export const AUTOPILOT_STAGNANT_CONVICTION_MAX = envInt(
  "AUTOPILOT_STAGNANT_CONVICTION_MAX",
  55,
  0,
  100,
);

/** 교체 회수된 티커 재진입 금지(분) — 같은 종목 재편입 왕복(churn) 방지. */
export const AUTOPILOT_COOLDOWN_MINUTES = envInt("AUTOPILOT_COOLDOWN_MINUTES", 30, 5, 180);

/** rotationLog 보존 상한 — payload(jsonb) 비대화 방지(영속 4초 타임아웃 보호). */
export const AUTOPILOT_ROTATION_LOG_MAX = 200;

// ─── 스크리너 하드필터 ────────────────────────────────────────────────────────

/** 가격 하한(원) — 동전주 슬리피지·조작 리스크 제외. */
export const AUTOPILOT_MIN_PRICE_KRW = envNumber("AUTOPILOT_MIN_PRICE_KRW", 1_000, 100, 100_000);

/** 가격 상한(원) — perSlotCash(기본 ≈333만)로 최소 ~10주 매매 가능선. */
export const AUTOPILOT_MAX_PRICE_KRW = envNumber(
  "AUTOPILOT_MAX_PRICE_KRW",
  300_000,
  10_000,
  10_000_000,
);

/** 누적 거래대금 하한(원) — 유동성 하한(미상 필드는 통과, 2차 분봉에서 재검증). */
export const AUTOPILOT_MIN_TRADING_VALUE_KRW = envNumber(
  "AUTOPILOT_MIN_TRADING_VALUE_KRW",
  10_000_000_000,
  0,
  Number.MAX_SAFE_INTEGER,
);

/** 등락률 하한(%) — 롱 온리 모멘텀(하락·보합 종목 제외). */
export const AUTOPILOT_MIN_CHANGE_PCT = envNumber("AUTOPILOT_MIN_CHANGE_PCT", 1.0, 0, 10);

/** 등락률 상한(%) — 상한가 부근 추격 금지(체결 불가·급반전 리스크). */
export const AUTOPILOT_MAX_CHANGE_PCT = envNumber("AUTOPILOT_MAX_CHANGE_PCT", 25.0, 5, 30);

/** 하드 제외 시장경보 — 정리매매·투자위험·투자경고(거래정지 직전 단계). 단기과열은 감점만. */
export const AUTOPILOT_HARD_EXCLUDE_WARNINGS: readonly string[] = [
  "LIQUIDATION_TRADING",
  "INVESTMENT_RISK",
  "INVESTMENT_WARNING",
];

// ─── 스크리너 shortlist·2차 점수 ──────────────────────────────────────────────

/** 1차 점수 상위 몇 종목의 분봉을 걷어 2차 점수를 낼지 — KIS 순차 호출 비용과의 균형. */
export const AUTOPILOT_SHORTLIST_SIZE = envInt("AUTOPILOT_SHORTLIST_SIZE", 8, 3, 15);

/**
 * 2차 ATR% 포화 프로파일 — 저점(죽은 변동성)/만점 플래토/극단(체결 불가·상한가·정지 근처) %.
 *
 * ★ 삼각(0.25/0.8/2.0)에서 포화로 전환(선정 품질 평가 근거): 스냅샷 4일 실측상 스크리너 점수가
 *   forward range 를 +0.19(4일 일관 양)로 예측하나, **최종 선정 마진에서 뽑힌 종목(range 3.19%)이
 *   미선정 상위(3.51%)보다 덜 움직임** — 삼각의 고ATR 감점(2%↑=0점)이 최대 무버를 상위에서 끌어내린
 *   것이 유력 원인. forward range 자체가 검증된 타깃이므로 고변동성을 감점할 이유가 없다. min↑plateau
 *   구간만 상승, plateau~extreme 는 만점 유지, extreme 초과만 soft 감점(상한가/VI 근처 체결 리스크).
 */
export const AUTOPILOT_ATR_PCT_MIN = envNumber("AUTOPILOT_ATR_PCT_MIN", 0.25, 0.05, 1);
export const AUTOPILOT_ATR_PCT_PLATEAU = envNumber("AUTOPILOT_ATR_PCT_PLATEAU", 1.5, 0.5, 4);
export const AUTOPILOT_ATR_PCT_EXTREME = envNumber("AUTOPILOT_ATR_PCT_EXTREME", 6.0, 3, 15);
