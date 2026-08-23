/**
 * ProfileCard — `/profile` 사용자 아이덴티티 헤더 (server component).
 *
 * profile-real-data — mock(김투자/PRO 멤버십/공격투자형/pravatar)을 걷어내고 `profiles` 테이블
 *   실데이터로 교체한다. 표시 항목은 **DB 에 실제로 있는 것만**:
 *     displayName(Google 프로필명) · email · role · createdAt · status.
 *   멤버십 티어·투자성향은 개념 자체가 스키마에 없어 제거했다(있지도 않은 등급을 보여주지 않는다).
 *   "프로필 수정" 버튼도 제거 — 수정할 필드도, 수정 화면도 없다.
 *
 * 아바타는 Google `picture` 를 세션에 싣지 않아(sub/email/role 만) 이니셜 아바타로 대체한다.
 *
 * 카드리스 화이트 포워드 유지 — 흰 바탕 위 평탄 아이덴티티 밴드, 여백으로만 아래 섹션과 분리.
 */

import { formatRelativeTime } from "@/lib/utils/formatRelativeTime";
import { ADMIN_ROLE_LABEL } from "@/lib/copy/admin/users";
import {
  PROFILE_NO_NAME,
  PROFILE_JOINED_SUFFIX,
  PROFILE_STATUS_PENDING,
} from "@/lib/copy/profile/labels";
import type { Profile } from "@/lib/types/auth/profile";

export interface ProfileCardProps {
  profile: Profile;
}

/** 이니셜 — 표시명 첫 글자, 없으면 이메일 로컬파트 첫 글자. 한글·영문 모두 1글자로 안전. */
function initialOf(profile: Profile): string {
  const source = profile.displayName?.trim() || profile.email;
  return [...source][0]?.toUpperCase() ?? "?";
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const name = profile.displayName?.trim() || PROFILE_NO_NAME;

  return (
    <section className="flex flex-col items-center gap-lg md:flex-row md:items-center md:gap-xl">
      <div
        className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-pill bg-gradient-to-br from-gradient-ai-from to-gradient-ai-to text-h1 text-surface"
        aria-hidden="true"
      >
        {initialOf(profile)}
      </div>
      <div className="min-w-0 flex-1 text-center md:text-left">
        <h2 className="text-h1 text-text-strong">{name}</h2>
        <p className="truncate text-body-md text-text-muted">{profile.email}</p>
        <div className="mt-md flex flex-wrap items-center justify-center gap-sm md:justify-start">
          <span className="badge-accent">{ADMIN_ROLE_LABEL[profile.role]}</span>
          {/* 승인 대기만 배지로 — approved 는 정상 상태라 굳이 알리지 않는다. */}
          {profile.status === "pending" && (
            <span className="badge-info">{PROFILE_STATUS_PENDING}</span>
          )}
          {/* 가입일은 값이 있을 때만 — 게스트(세션 없음)는 createdAt 이 비어 있어 "1970.01.01 가입"
              같은 무의미한 표기가 새지 않게 한다. 3일 넘으면 절대 날짜, 그 안이면 상대 표기. */}
          {profile.createdAt && (
            <span className="text-caption text-text-muted">
              {formatRelativeTime(profile.createdAt)}
              {PROFILE_JOINED_SUFFIX}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
