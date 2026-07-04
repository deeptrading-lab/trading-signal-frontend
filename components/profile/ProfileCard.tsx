/**
 * ProfileCard — `/profile` 사용자 아이덴티티 헤더 (server component).
 *
 * PR9 (finsight-redesign) → **profile-reskin**(카드리스 화이트 포워드).
 *
 * 시안 `Profile.tsx` L10~L25 정합 — avatar + 이름/email + 멤버십·투자성향 칩 + "프로필 수정" 버튼.
 *
 * profile-reskin — 카드 박스(`card-hero`) 폐기 → 흰 바탕 위 평탄 아이덴티티 밴드. 마이페이지의
 *   유일 라이트 카드는 "내 자산" 히어로(`asset-hero`) 뿐이며, 본 아이덴티티는 페이지 상단 헤더로서
 *   여백(컴포저 `gap-2xl`)으로만 아래 섹션과 분리한다(토스 톤 프로필 헤더).
 *
 * 구조:
 *   - 모바일: 1-col 세로 (avatar 위 + 정보 중앙 + 버튼 아래 전폭).
 *   - 데스크탑(md+): 가로 (avatar 좌 + 정보 좌측 + 버튼 우측 끝).
 *
 * 토큰:
 *   - avatar = 그라데이션 (`bg-gradient-to-br from-gradient-ai-from to-gradient-ai-to`) +
 *     중앙 `User` 아이콘 (`text-surface`). 카드리스에 맞춰 96→80px 로 컴팩트화.
 *   - 이름 = `text-h1 text-text-strong`(아이덴티티 focal). email = `text-body-md text-text-muted`.
 *   - 멤버십 칩 = `badge-accent`. 투자성향 칩 = `badge-info`.
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
    <section className="flex flex-col items-center gap-lg md:flex-row md:items-center md:gap-xl">
      <div
        className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-pill bg-gradient-to-br from-gradient-ai-from to-gradient-ai-to text-surface"
        aria-hidden="true"
      >
        <User className="h-10 w-10" />
      </div>
      <div className="min-w-0 flex-1 text-center md:text-left">
        <h2 className="text-h1 text-text-strong">{user.name}</h2>
        <p className="truncate text-body-md text-text-muted">{user.email}</p>
        <div className="mt-md flex flex-wrap justify-center gap-sm md:justify-start">
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
