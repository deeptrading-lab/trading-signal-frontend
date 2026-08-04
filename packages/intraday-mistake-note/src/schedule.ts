const KST_TIME_ZONE = "Asia/Seoul";

function kstParts(now: Date): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

function previousDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

export function defaultReviewDate(now = new Date(), runAfterKst = "16:30"): string {
  const [hour, minute] = runAfterKst.split(":").map(Number);
  const cutoff = hour * 60 + minute;
  const current = kstParts(now);
  return current.minutes >= cutoff ? current.date : previousDate(current.date);
}

export function shouldSkipRemoteReview(input: {
  day: string;
  dryRun: boolean;
  forceRefresh: boolean;
  lastSuccessfulDate?: string;
  lastInputHash?: string;
}): boolean {
  return (
    !input.dryRun &&
    !input.forceRefresh &&
    input.lastSuccessfulDate === input.day &&
    Boolean(input.lastInputHash)
  );
}
