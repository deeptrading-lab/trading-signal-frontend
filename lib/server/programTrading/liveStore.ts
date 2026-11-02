import { mkdir, open, readFile } from "node:fs/promises";
import type { LiveState } from "./liveTypes";

export type LiveEvent = { at: string; kind: string; detail: unknown; state: LiveState };
export type LiveStore = { load(): Promise<LiveState | null>; commit(state: LiveState, kind: string, detail?: unknown): Promise<void>; events(): Promise<LiveEvent[]> };
// The synced append-only journal is the recovery source, including order intentions.
// A crash after sync but before HTTP response restores the intention and never resubmits it.
export async function createLiveStore(dir: string): Promise<LiveStore> {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const path = `${dir}/live.jsonl`;
  let records: LiveEvent[] = [];
  try {
    const source = await readFile(path, "utf8");
    const lines = source.split("\n");
    // An incomplete tail cannot be an acknowledged intent (commit returns only after fsync).
    if (lines.at(-1) !== "") {
      const handle = await open(path, "r+");
      try { await handle.truncate(Buffer.byteLength(source.slice(0, source.lastIndexOf("\n") + 1))); await handle.sync(); } finally { await handle.close(); }
      lines.pop();
    }
    records = lines.filter(Boolean).map(line => JSON.parse(line));
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  return {
    async load() { return records.length ? structuredClone(records.at(-1)!.state) : null; },
    async events() { return structuredClone(records); },
    async commit(state, kind, detail = null) {
      const event = { at: new Date().toISOString(), kind, detail, state: structuredClone(state) };
      const handle = await open(path, "a", 0o600);
      try { await handle.writeFile(JSON.stringify(event) + "\n"); await handle.sync(); } finally { await handle.close(); }
      const parent = await open(dir, "r");
      try { await parent.sync(); } finally { await parent.close(); }
      records.push(event);
    },
  };
}
