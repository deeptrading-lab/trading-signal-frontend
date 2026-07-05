/**
 * AdminUsersPanel — 유저 관리 화면 본문(client). **admin 이상**(상위 서버 page 가 role 방어).
 *
 * PRD user-login-auth Phase 2(3-tier 권한):
 *   - 전체 사용자 목록 + 승인/취소 — admin·superadmin 공통.
 *   - 등급 드롭다운은 **superadmin 만**(`canChangeRole`) — admin 은 등급을 읽기 전용 텍스트로만 본다.
 *   - 도메인 훅 `useAdminUsers`. 카드리스 플랫 목록 — 토큰만(hex/px 직타 0).
 *   - 등급 변경 라우트(`/users/role`)는 superadmin 전용 재방어 · 마지막 최고관리자 강등 409.
 */

"use client";

import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { Button } from "@/components/ui/Button";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { formatRelativeTime } from "@/lib/utils/formatRelativeTime";
import { ALL_ROLES } from "@/lib/auth/roles";
import type { ProfileRole } from "@/lib/types/auth/profile";
import {
  ADMIN_USERS_TITLE,
  ADMIN_USERS_SUBTITLE,
  ADMIN_USERS_LOADING,
  ADMIN_USERS_ERROR,
  ADMIN_USERS_EMPTY,
  ADMIN_USERS_RETRY,
  ADMIN_USERS_NO_NAME,
  ADMIN_ROLE_LABEL,
  ADMIN_ROLE_SELECT_LABEL,
  ADMIN_STATUS_APPROVED,
  ADMIN_STATUS_PENDING,
  ADMIN_USERS_APPROVE_CTA,
  ADMIN_USERS_REVOKE_CTA,
  ADMIN_JOINED_PREFIX,
} from "@/lib/copy/admin/users";

export interface AdminUsersPanelProps {
  /** 등급 드롭다운 노출 — superadmin 만 true. admin 은 등급 읽기 전용. */
  canChangeRole: boolean;
}

/** 등급 드롭다운 옵션(낮은→높은) — SelectMenu 제네릭 `{ label, value }`. */
const ROLE_OPTIONS: { label: string; value: ProfileRole }[] = ALL_ROLES.map(
  (role) => ({ label: ADMIN_ROLE_LABEL[role], value: role }),
);

export function AdminUsersPanel({ canChangeRole }: AdminUsersPanelProps) {
  const {
    users,
    isLoading,
    isError,
    refetch,
    changeRole,
    setStatus,
    mutating,
  } = useAdminUsers();
  const anyMutating = mutating !== null;

  return (
    <section className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg px-lg py-xl">
      <header className="flex flex-col gap-xs">
        <h1 className="text-h1 text-text-strong">{ADMIN_USERS_TITLE}</h1>
        <p className="text-body-sm text-text-muted">{ADMIN_USERS_SUBTITLE}</p>
      </header>

      {isLoading ? (
        <p className="text-body-sm text-text-muted">{ADMIN_USERS_LOADING}</p>
      ) : isError ? (
        <div className="flex flex-col items-start gap-sm">
          <p className="text-body-sm text-critical">{ADMIN_USERS_ERROR}</p>
          <Button variant="secondary" onClick={refetch}>
            {ADMIN_USERS_RETRY}
          </Button>
        </div>
      ) : users.length === 0 ? (
        <p className="text-body-sm text-text-muted">{ADMIN_USERS_EMPTY}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border-line">
          {users.map((u) => {
            const approved = u.status === "approved";
            const roleLoading =
              mutating?.sub === u.sub && mutating.kind === "role";
            const statusLoading =
              mutating?.sub === u.sub && mutating.kind === "status";
            return (
              <li
                key={u.sub}
                className="flex flex-col gap-sm py-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-xs">
                  <span className="truncate text-body-md text-text-strong">
                    {u.displayName || ADMIN_USERS_NO_NAME}
                  </span>
                  <span className="truncate text-caption text-text-muted">
                    {u.email}
                  </span>
                  <span className="text-caption text-text-muted">
                    {ADMIN_JOINED_PREFIX} {formatRelativeTime(u.createdAt)}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-sm">
                  <span
                    className={
                      approved
                        ? "text-caption text-text-muted"
                        : "text-caption text-warn"
                    }
                  >
                    {approved ? ADMIN_STATUS_APPROVED : ADMIN_STATUS_PENDING}
                  </span>

                  {canChangeRole ? (
                    <SelectMenu
                      options={ROLE_OPTIONS}
                      value={u.role}
                      onChange={(role) => changeRole(u.sub, role)}
                      ariaLabel={ADMIN_ROLE_SELECT_LABEL}
                      align="right"
                      disabled={anyMutating}
                      loading={roleLoading}
                    />
                  ) : (
                    // admin — 등급 읽기 전용(superadmin 만 변경).
                    <span className="text-caption text-text-strong">
                      {ADMIN_ROLE_LABEL[u.role]}
                    </span>
                  )}

                  <Button
                    variant={approved ? "secondary" : "primary"}
                    size="sm"
                    onClick={() => setStatus(u.sub, approved ? "pending" : "approved")}
                    disabled={anyMutating}
                    loading={statusLoading}
                    className="whitespace-nowrap"
                  >
                    {approved ? ADMIN_USERS_REVOKE_CTA : ADMIN_USERS_APPROVE_CTA}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
