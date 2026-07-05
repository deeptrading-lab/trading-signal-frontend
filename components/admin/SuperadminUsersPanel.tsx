/**
 * SuperadminUsersPanel — 유저 관리 화면 본문(client). **superadmin 전용**(상위 서버 page 가 role 방어).
 *
 * PRD user-login-auth Phase 2(3-tier 권한):
 *   - 전체 사용자 목록 + 행별 등급 드롭다운(user/admin/superadmin) + 승인/취소.
 *   - 도메인 훅 `useSuperadminUsers` 만 사용. 카드리스 플랫 목록 — 토큰만(hex/px 직타 0).
 *   - 마지막 최고관리자 강등은 409 → 상단 alert. 각 변경은 route 가 재차 superadmin 방어.
 */

"use client";

import { useSuperadminUsers } from "@/hooks/admin/useSuperadminUsers";
import { Button } from "@/components/ui/Button";
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
  ADMIN_ROLE_CHANGE_ERROR,
  ADMIN_LAST_SUPERADMIN_ERROR,
} from "@/lib/copy/admin/users";

export function SuperadminUsersPanel() {
  const {
    users,
    isLoading,
    isError,
    refetch,
    changeRole,
    setStatus,
    mutatingSub,
    lastError,
  } = useSuperadminUsers();

  return (
    <section className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg px-lg py-xl">
      <header className="flex flex-col gap-xs">
        <h1 className="text-h1 text-text-strong">{ADMIN_USERS_TITLE}</h1>
        <p className="text-body-sm text-text-muted">{ADMIN_USERS_SUBTITLE}</p>
      </header>

      {lastError ? (
        <p role="alert" className="input-helper-error">
          {lastError === "last_superadmin"
            ? ADMIN_LAST_SUPERADMIN_ERROR
            : ADMIN_ROLE_CHANGE_ERROR}
        </p>
      ) : null}

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
            const busy = mutatingSub === u.sub;
            const approved = u.status === "approved";
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

                  <label className="sr-only" htmlFor={`role-${u.sub}`}>
                    {ADMIN_ROLE_SELECT_LABEL}
                  </label>
                  <select
                    id={`role-${u.sub}`}
                    value={u.role}
                    disabled={busy}
                    onChange={(e) => changeRole(u.sub, e.target.value as ProfileRole)}
                    className="cursor-pointer rounded-sm border border-border-line bg-surface px-sm py-xs text-caption text-text-strong disabled:opacity-60"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ADMIN_ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant={approved ? "secondary" : "primary"}
                    onClick={() => setStatus(u.sub, approved ? "pending" : "approved")}
                    disabled={busy}
                    aria-busy={busy}
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
