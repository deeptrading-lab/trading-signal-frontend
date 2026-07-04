/**
 * AdminApprovalsPanel — 가입 승인 화면 본문(client).
 *
 * PRD `user-login-auth` §3.7:
 *   - 대기(pending) 목록 + 행별 "승인" 버튼 1개의 최소 승인 UI.
 *   - 도메인 훅 `useAdminApprovals` 만 사용(TanStack 인터페이스 직접 노출 0).
 *   - 카드리스 플랫 목록 — 토큰만(hex/px 직타 0). role 방어는 상위 서버 page 가 수행.
 */

"use client";

import { Check } from "lucide-react";
import { useAdminApprovals } from "@/hooks/admin/useAdminApprovals";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/utils/formatRelativeTime";
import {
  ADMIN_APPROVALS_TITLE,
  ADMIN_APPROVALS_SUBTITLE,
  ADMIN_APPROVALS_LOADING,
  ADMIN_APPROVALS_ERROR,
  ADMIN_APPROVALS_EMPTY,
  ADMIN_APPROVALS_RETRY,
  ADMIN_APPROVE_CTA,
  ADMIN_APPROVE_PENDING,
  ADMIN_APPROVE_ERROR,
  ADMIN_REQUESTED_AT_PREFIX,
  ADMIN_NO_NAME,
} from "@/lib/copy/admin/approvals";

export function AdminApprovalsPanel() {
  const {
    profiles,
    isLoading,
    isError,
    refetch,
    approve,
    approvingSub,
    isApproveError,
  } = useAdminApprovals();

  return (
    <section className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg px-lg py-xl">
      <header className="flex flex-col gap-xs">
        <h1 className="text-h1 text-text-strong">{ADMIN_APPROVALS_TITLE}</h1>
        <p className="text-body-sm text-text-muted">{ADMIN_APPROVALS_SUBTITLE}</p>
      </header>

      {isApproveError ? (
        <p role="alert" className="input-helper-error">
          {ADMIN_APPROVE_ERROR}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-body-sm text-text-muted">{ADMIN_APPROVALS_LOADING}</p>
      ) : isError ? (
        <div className="flex flex-col items-start gap-sm">
          <p className="text-body-sm text-critical">{ADMIN_APPROVALS_ERROR}</p>
          <Button variant="secondary" onClick={refetch}>
            {ADMIN_APPROVALS_RETRY}
          </Button>
        </div>
      ) : profiles.length === 0 ? (
        <p className="text-body-sm text-text-muted">{ADMIN_APPROVALS_EMPTY}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border-line">
          {profiles.map((profile) => {
            const approving = approvingSub === profile.sub;
            return (
              <li
                key={profile.sub}
                className="flex items-center justify-between gap-md py-md"
              >
                <div className="flex min-w-0 flex-col gap-xs">
                  <span className="truncate text-body-md text-text-strong">
                    {profile.displayName || ADMIN_NO_NAME}
                  </span>
                  <span className="truncate text-caption text-text-muted">
                    {profile.email}
                  </span>
                  <span className="text-caption text-text-muted">
                    {ADMIN_REQUESTED_AT_PREFIX}{" "}
                    {formatRelativeTime(profile.createdAt)}
                  </span>
                </div>
                <Button
                  variant="primary"
                  onClick={() => approve(profile.sub)}
                  disabled={approving}
                  aria-disabled={approving}
                  aria-busy={approving}
                  className="inline-flex shrink-0 items-center gap-xs whitespace-nowrap"
                >
                  {approving ? null : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                  {approving ? ADMIN_APPROVE_PENDING : ADMIN_APPROVE_CTA}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
