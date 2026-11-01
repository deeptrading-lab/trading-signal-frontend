/**
 * SwingNoteSection — 스윙 체크 카드 안 "최근 뉴스·공시 (AI 정리)"(PRD `swing-judgment` PR-4).
 *
 * 사용자가 누를 때만 요청 → 로컬 AI 워커가 처리(예약 자동 호출 없음). 처리 중엔 훅이 10초마다 다시 읽는다.
 * 판정과 무관 — 이 섹션은 노트 API 만 부르고, 카드의 조건·주의 사유는 그대로다.
 * 링크는 검증된 http(s) 원문만(서버 validateSwingNote), 새 탭.
 */

"use client";

import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMutationSwingNote } from "@/hooks/swing/useMutationSwingNote";
import { isSwingNoteActive, useQuerySwingNote } from "@/hooks/swing/useQuerySwingNote";
import type { SwingNote } from "@/lib/types/swing/api";
import {
  SWING_NOTE_CATEGORY_LABEL,
  SWING_NOTE_DIRECTION_LABEL,
  SWING_NOTE_EMPTY,
  SWING_NOTE_ERROR,
  SWING_NOTE_FAILED,
  SWING_NOTE_HELP,
  SWING_NOTE_HIGH,
  SWING_NOTE_PENDING,
  SWING_NOTE_REFRESH,
  SWING_NOTE_REQUEST,
  SWING_NOTE_RUNNING,
  SWING_NOTE_TITLE,
  swingNoteDateLabel,
  swingNoteHost,
  swingNoteTimeLabel,
} from "@/lib/copy/swing/note";

const TITLE_ID = "swing-note-title";

export function SwingNoteSection({ ticker }: { ticker: string }) {
  const { data, isLoading } = useQuerySwingNote(ticker);
  const request = useMutationSwingNote(ticker);
  const note = data?.note ?? null;
  const active = isSwingNoteActive(data);

  return (
    <section aria-labelledby={TITLE_ID} className="flex flex-col gap-sm">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h3 id={TITLE_ID} className="text-body-sm-strong text-text-strong">
          {SWING_NOTE_TITLE}
        </h3>
        {/* 처리 중에도 버튼을 남겨(비활성) 키보드 포커스가 사라지지 않게 한다. */}
        {data?.canRequest || active ? (
          <button
            type="button"
            className="button-secondary"
            disabled={active || request.isPending}
            onClick={() => request.mutate()}
          >
            {active ? SWING_NOTE_RUNNING : note ? SWING_NOTE_REFRESH : SWING_NOTE_REQUEST}
          </button>
        ) : null}
      </div>
      <p className="text-caption text-text-muted">{SWING_NOTE_HELP}</p>
      {/* 항상 붙어 있는 알림 영역 — 처리 중 → 완료 전환을 스크린리더가 읽는다. */}
      <div aria-live="polite">
        {isLoading ? <Skeleton variant="line" /> : <NoteBody data={data ? note : undefined} active={active} />}
      </div>
      {request.isError ? (
        <p role="alert" className="text-caption text-warn">
          {request.error.message}
        </p>
      ) : null}
    </section>
  );
}

/** data 가 undefined 면 조회 실패, null 이면 아직 노트 없음. */
function NoteBody({ data, active }: { data: SwingNote | null | undefined; active: boolean }) {
  if (data === undefined) return <p className="text-caption text-text-muted">{SWING_NOTE_ERROR}</p>;
  if (data === null) return null;
  if (active) return <p className="text-caption text-text-muted">{SWING_NOTE_PENDING}</p>;
  if (data.status === "failed") return <p className="text-caption text-text-muted">{SWING_NOTE_FAILED}</p>;
  const items = data.items ?? [];
  return (
    <div className="flex flex-col gap-xs">
      {items.length === 0 ? (
        <p className="text-caption text-text-muted">{SWING_NOTE_EMPTY}</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((it) => (
            <li key={`${it.url}|${it.title}`} className="flex flex-col gap-xs border-b border-border-line py-sm last:border-b-0">
              <a
                href={it.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-body-sm-strong text-text-strong hover:underline"
              >
                {it.title}
              </a>
              <p className="text-caption text-text-muted">{it.summary}</p>
              <p className="flex flex-wrap items-center gap-xs text-caption text-text-muted">
                <span>
                  {swingNoteDateLabel(it.date)} · {it.source}({swingNoteHost(it.url)}) ·{" "}
                  {SWING_NOTE_CATEGORY_LABEL[it.category]} · {SWING_NOTE_DIRECTION_LABEL[it.direction]}
                </span>
                {it.materiality === "high" ? <Badge variant="accent">{SWING_NOTE_HIGH}</Badge> : null}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-caption text-text-muted">{swingNoteTimeLabel(data.finishedAt ?? data.createdAt)}</p>
    </div>
  );
}
