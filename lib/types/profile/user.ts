/**
 * `/profile` 의 사용자 프로필 카드 데이터.
 *
 * 시안 `Profile.tsx` 의 프로필 카드 정합 — 이름 / 이메일 / 아바타 / 멤버십 / 투자성향.
 */

export type MembershipTier = "FREE" | "PRO" | "ENTERPRISE";

export type InvestorType =
  | "CONSERVATIVE"
  | "MODERATE"
  | "BALANCED"
  | "GROWTH"
  | "AGGRESSIVE";

export type UserProfile = {
  /** 사용자 이름 (한글). */
  name: string;
  /** 이메일. */
  email: string;
  /** 아바타 이미지 URL (placeholder pravatar 등). */
  avatarUrl: string;
  membership: MembershipTier;
  investorType: InvestorType;
};
