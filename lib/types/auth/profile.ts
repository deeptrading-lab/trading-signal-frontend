/**
 * 사용자 프로필 타입 — Google 로그인 신원 + 승인 상태(PRD user-login-auth §3.1).
 *
 * `profiles` 테이블(Supabase)의 앱측 표현. PK 는 Google `sub`(이메일 변경에도 불변, §9 q5).
 * 스토어(`lib/server/auth/profileStore.ts`)가 snake_case 행 → 본 camelCase 타입으로 매핑한다.
 */

/** 역할 — `user`(기본) / `admin`(승인 권한). 세션 payload 의 role 과 동일 union. */
export type ProfileRole = "user" | "admin";

/** 승인 상태 — `pending`(대기) / `approved`(접근 허용). */
export type ProfileStatus = "pending" | "approved";

/** 사용자 프로필(앱측 camelCase). */
export type Profile = {
  /** Google 안정 식별자(subject). PK. */
  sub: string;
  /** 소문자 정규화된 이메일(unique). */
  email: string;
  /** 역할. */
  role: ProfileRole;
  /** 승인 상태. */
  status: ProfileStatus;
  /** Google 프로필명(없을 수 있음). */
  displayName: string | null;
  /** 최초 생성 시각(ISO). */
  createdAt: string;
  /** 최종 갱신 시각(ISO). */
  updatedAt: string;
};

/** 로그인 시 upsert 결과 — 게이트/세션 발급 분기에 필요한 최소 신원. */
export type ProfileLoginOutcome = {
  role: ProfileRole;
  status: ProfileStatus;
};
