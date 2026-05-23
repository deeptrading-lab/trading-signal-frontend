/**
 * `/profile` 사용자 프로필 mock.
 *
 * 시안 `Profile.tsx` 의 프로필 카드 정합 — 김투자 / investor.kim@example.com / PRO 멤버십 / 공격투자형.
 * 멤버십·투자성향 enum 의 한글 매핑은 `lib/copy/profile/labels.ts`.
 */

import type { UserProfile } from "@/lib/types/profile/user";

export const USER_PROFILE_MOCK: UserProfile = {
  name: "김투자",
  email: "investor.kim@example.com",
  avatarUrl: "https://i.pravatar.cc/150?img=33",
  membership: "PRO",
  investorType: "AGGRESSIVE",
};
