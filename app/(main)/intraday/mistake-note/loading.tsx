export default function IntradayMistakeNoteLoading() {
  return (
    <div className="mx-auto flex w-full max-w-main-max-w animate-pulse flex-col gap-lg" aria-label="오답노트 불러오는 중">
      <div className="h-10 rounded-md bg-surface-muted" />
      <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-lg bg-surface-muted" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-surface-muted" />
    </div>
  );
}
