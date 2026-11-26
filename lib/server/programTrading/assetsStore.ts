import { createHash, randomUUID } from "node:crypto";
import { getSupabaseServiceConfig } from "@/lib/server/supabase/egressGuard";
import type { ProgramAssets } from "@/lib/types/programTrading/assets";
import { DEFAULT_PROGRAM_ASSETS, isProgramAssets } from "@/lib/validation/programTrading/assets";
import { PROGRAM_ASSETS_COPY as C } from "@/lib/copy/programTrading/assets";

type AssetRow = { amount: number; source: "manual" | "session"; effective_at: string };
async function request(ownerSub: string, body?: object): Promise<AssetRow[]> {
  const config = getSupabaseServiceConfig();
  if (!config) throw new Error(C.database);
  const url = new URL(`${config.url}/rest/v1/program_paper_asset_events`);
  url.search = new URLSearchParams(body ? { on_conflict: "id" } : {
    owner_sub: `eq.${ownerSub}`, select: "amount,source,effective_at",
    order: "effective_at.desc,created_at.desc,id.desc", limit: "1",
  }).toString();
  const headers: Record<string, string> = { apikey: config.key, "Content-Type": "application/json" };
  if (!config.key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${config.key}`;
  if (body) headers.Prefer = "resolution=ignore-duplicates,return=minimal";
  try {
    const response = await fetch(url, {
      method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined,
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(C.database);
    return body ? [] : await response.json();
  } catch { throw new Error(C.database); }
}

export async function readProgramAssets(ownerSub: string): Promise<ProgramAssets> {
  const [row] = await request(ownerSub);
  if (!row) return { amount: DEFAULT_PROGRAM_ASSETS, source: "default", updatedAt: null };
  if (!isProgramAssets(row.amount) || !["manual", "session"].includes(row.source) || !Number.isFinite(Date.parse(row.effective_at))) throw new Error(C.database);
  return { amount: row.amount, source: row.source, updatedAt: row.effective_at };
}

export async function saveProgramAssets(ownerSub: string, amount: number, session?: { startedAt: string; finishedAt: string }) {
  if (!isProgramAssets(amount)) throw new Error(C.invalid);
  const id = session
    ? createHash("sha256").update(JSON.stringify([ownerSub, session.startedAt])).digest("hex")
    : randomUUID();
  await request(ownerSub, {
    id, owner_sub: ownerSub, amount, source: session ? "session" : "manual",
    effective_at: session?.finishedAt ?? new Date().toISOString(),
  });
}
