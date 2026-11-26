export const DEFAULT_PROGRAM_ASSETS = 10_000_000;
export function isProgramAssets(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
