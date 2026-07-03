import Link from "next/link";
import { Home } from "lucide-react";
import { BrandLockup } from "@/components/layout/BrandLockup";
import {
  NOT_FOUND_TITLE,
  NOT_FOUND_DESCRIPTION,
  NOT_FOUND_HOME_CTA,
} from "@/lib/copy/layout/navCopy";

/**
 * NotFoundView — 루트(`app/not-found`)와 셸 내부(`(main)/not-found`)가 공유하는 온브랜드 빈 상태 본문.
 *
 * 브랜드 배지 큐(워드마크 없이 글리프만) + 안내 문구 + "홈으로" CTA. 두 404 화면의 시각/카피를
 * 단일 진실 원천으로 통일한다. 바깥 래퍼(풀스크린 vs 셸 콘텐츠 폭)는 각 not-found 파일이 제공.
 * 카드리스 — 흰 바탕 위 중앙 정렬, hex/px 직타 0건. 서버 호환.
 */
export function NotFoundView() {
  return (
    <div className="flex flex-col items-center gap-lg text-center">
      <BrandLockup showWordmark={false} />
      <div className="flex flex-col items-center gap-sm">
        <h1 className="text-display text-text-strong">{NOT_FOUND_TITLE}</h1>
        <p className="max-w-[360px] text-body-md text-text-muted">
          {NOT_FOUND_DESCRIPTION}
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
  );
}
