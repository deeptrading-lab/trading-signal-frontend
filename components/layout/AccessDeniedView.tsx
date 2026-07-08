import Link from "next/link";
import { Home, ShieldAlert } from "lucide-react";
import {
  ACCESS_DENIED_TITLE,
  ACCESS_DENIED_DESCRIPTION_LINES,
  NOT_FOUND_HOME_CTA,
} from "@/lib/copy/layout/navCopy";

/**
 * AccessDeniedView — 관리자 전용 라우트를 권한 미달(일반 등급)이 직접 URL 로 접근했을 때 보여주는
 * 온브랜드 차단 화면. `NotFoundView` 와 같은 카드리스 중앙 정렬 톤을 공유하되, 404(존재 은닉)와 달리
 * "권한이 없다"를 명시한다(사용자 결정 — 눈에 보이는 안내 화면). 셸(`(main)`) 안에서 렌더돼
 * 사이드바/헤더는 유지된다.
 *
 * 미로그인 사용자는 `proxy.ts` 게이트가 먼저 `/login` 으로 보내므로, 이 화면은 주로 **로그인했지만
 * 등급이 부족한** 사용자에게 노출된다. 서버 호환(useState 0) — 서버 컴포넌트 page 가 조건부로 렌더.
 */
export function AccessDeniedView() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-main-max-w items-center justify-center">
      <div className="flex flex-col items-center gap-lg text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-text-muted"
          aria-hidden="true"
        >
          <ShieldAlert className="h-7 w-7" />
        </span>
        <div className="flex flex-col items-center gap-sm">
          <h1 className="text-display text-text-strong">{ACCESS_DENIED_TITLE}</h1>
          <p className="max-w-[360px] text-body-md text-text-muted">
            {ACCESS_DENIED_DESCRIPTION_LINES.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>
        <Link
          href="/"
          className="button-primary inline-flex items-center justify-center gap-sm no-underline"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          {NOT_FOUND_HOME_CTA}
        </Link>
      </div>
    </div>
  );
}
