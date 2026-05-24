/**
 * ProfileCard — `/profile` 사용자 hero 카드 (server component).
 *
 * PR9 (finsight-redesign) 신규.
 *
 * 시안 `Profile.tsx` L10~L25 정합 — avatar + 이름/email + 멤버십·투자성향 칩 + "프로필 수정" 버튼.
 *
 * 구조:
 *   - 모바일: 1-col 세로 (avatar 위 + 정보 중앙 + 버튼 아래 전폭).
 *   - 데스크탑(md+): 가로 (avatar 좌 + 정보 좌측 + 버튼 우측 끝).
 *
 * v8 토큰:
 *   - 카드 셸 = `card-hero` 합성 토큰 (rounded.xl + hero-px padding).
 *   - avatar = 그라데이션 (`bg-gradient-to-br from-gradient-ai-from to-gradient-ai-to`) +
 *     중앙 `User` 아이콘 (`text-surface`). 시안의 외부 이미지 (`pravatar.cc`) 는 Next.js
 *     image 도메인 등록 회피 위해 본 PR9 범위에서 lucide User cascade.
 *   - 이름 = `text-h1 text-text-strong`. email = `text-body-md text-text-muted`.
 *   - 멤버십 칩 = `badge-accent` (PRO/FREE/ENTERPRISE 무관 동일 시각 — 데모 단계).
 *   - 투자성향 칩 = `badge-info` (v8 정착 토큰).
 *   - "프로필 수정" = `button-primary`.
 */

import { User } from "lucide-react";
import type {
  UserProfile,
  MembershipTier,
  InvestorType,
} from "@/lib/types/profile/user";
import {
  MEMBERSHIP_FREE,
  MEMBERSHIP_PRO,
  MEMBERSHIP_ENTERPRISE,
  INVESTOR_TYPE_PREFIX,
  INVESTOR_TYPE_CONSERVATIVE,
  INVESTOR_TYPE_MODERATE,
  INVESTOR_TYPE_BALANCED,
  INVESTOR_TYPE_GROWTH,
  INVESTOR_TYPE_AGGRESSIVE,
} from "@/lib/copy/profile/labels";
import { PROFILE_EDIT_BUTTON } from "@/lib/copy/profile/buttons";

export interface ProfileCardProps {
  user: UserProfile;
}

const MEMBERSHIP_LABEL: Record<MembershipTier, string> = {
  FREE: MEMBERSHIP_FREE,
  PRO: MEMBERSHIP_PRO,
  ENTERPRISE: MEMBERSHIP_ENTERPRISE,
};

const INVESTOR_LABEL: Record<InvestorType, string> = {
  CONSERVATIVE: INVESTOR_TYPE_CONSERVATIVE,
  MODERATE: INVESTOR_TYPE_MODERATE,
  BALANCED: INVESTOR_TYPE_BALANCED,
  GROWTH: INVESTOR_TYPE_GROWTH,
  AGGRESSIVE: INVESTOR_TYPE_AGGRESSIVE,
};

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    <section className="card-hero flex flex-col items-center gap-lg md:flex-row md:items-center md:gap-2xl">
      <div
        className="shrink-0 inline-flex items-center justify-center h-24 w-24 rounded-pill bg-gradient-to-br from-gradient-ai-from to-gradient-ai-to text-surface"
        aria-hidden="true"
      >
        <User className="h-12 w-12" />
      </div>
      <div className="flex-1 text-center md:text-left">
        <h2 className="text-h1 text-text-strong">{user.name}</h2>
        <p className="text-body-md text-text-muted">{user.email}</p>
        <div className="mt-md flex flex-wrap gap-sm justify-center md:justify-start">
          <span className="badge-accent">
            {MEMBERSHIP_LABEL[user.membership]}
          </span>
          <span className="badge-info">
            {INVESTOR_TYPE_PREFIX}
            {INVESTOR_LABEL[user.investorType]}
          </span>
        </div>
      </div>
      <button type="button" className="button-primary w-full md:w-auto">
        {PROFILE_EDIT_BUTTON}
      </button>
    </section>
  );
}
