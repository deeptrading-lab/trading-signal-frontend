import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as gate from "@/lib/server/ai/concurrencyGate";
import {
  MAX_CONCURRENT,
  currentCount,
  release,
  resetForTest,
  tryAcquire,
} from "@/lib/server/ai/concurrencyGate";

beforeEach(() => resetForTest());
afterEach(() => resetForTest());

describe("concurrencyGate — 카운터 세마포어", () => {
  it("초기 카운트는 0", () => {
    expect(currentCount()).toBe(0);
  });

  it("N개까지 acquire 성공, N+1번째는 false (over-cap 거절)", () => {
    for (let i = 0; i < MAX_CONCURRENT; i += 1) {
      expect(tryAcquire()).toBe(true);
    }
    expect(currentCount()).toBe(MAX_CONCURRENT);
    // 가득 찬 상태에서 추가 acquire 는 거절(카운트 불변).
    expect(tryAcquire()).toBe(false);
    expect(currentCount()).toBe(MAX_CONCURRENT);
  });

  it("release 로 슬롯이 빠지면 다음 acquire 성공", () => {
    for (let i = 0; i < MAX_CONCURRENT; i += 1) tryAcquire();
    expect(tryAcquire()).toBe(false);

    release();
    expect(currentCount()).toBe(MAX_CONCURRENT - 1);
    // 한 칸 비었으니 다시 성공.
    expect(tryAcquire()).toBe(true);
    expect(currentCount()).toBe(MAX_CONCURRENT);
  });

  it("acquire/release 짝이 맞으면 카운트가 0으로 복귀", () => {
    tryAcquire();
    tryAcquire();
    release();
    release();
    expect(currentCount()).toBe(0);
  });

  it("중복 release 는 카운트를 음수로 만들지 않는다(0 클램프)", () => {
    release();
    release();
    expect(currentCount()).toBe(0);
    // 클램프 후에도 정상 acquire.
    expect(tryAcquire()).toBe(true);
    expect(currentCount()).toBe(1);
  });

  it("N은 PRD 고정값 3", () => {
    expect(MAX_CONCURRENT).toBe(3);
  });
});

/**
 * AC-8 / R1 / A5 격리 회귀 — 세마포어 모듈에 요청 데이터(ticker/runId/state/decision)가
 * 0건임을 정적으로 보증한다. 이 불변식이 깨지면 PM 결과 섞임이 재발(concurrent-ai-analysis 조사).
 */
describe("concurrencyGate — 격리(요청 데이터 0)", () => {
  it("export 표면은 카운터·상수·테스트 헬퍼뿐 — 요청 데이터를 받거나 보관하는 멤버 0", () => {
    const exported = Object.keys(gate).sort();
    // 허용 목록: 순수 카운터 API + 상수 + 테스트 헬퍼. 그 외 멤버가 생기면 실패.
    expect(exported).toEqual(
      ["MAX_CONCURRENT", "currentCount", "release", "resetForTest", "tryAcquire"].sort(),
    );
  });

  it("tryAcquire·release 는 인자를 받지 않는다(ticker/runId 등 요청 키 주입 불가)", () => {
    // 함수 arity 0 → 요청별 식별자를 모듈에 넘길 통로 자체가 없음.
    expect(tryAcquire.length).toBe(0);
    expect(release.length).toBe(0);
  });

  it("동시 점유 N개여도 공유 상태는 정수 카운터 1개뿐 — 슬롯별 데이터 분리 보관 없음", () => {
    // 서로 다른 요청을 흉내내 N번 acquire 해도, 노출되는 공유 상태는 카운트(정수) 하나로 수렴.
    // (슬롯마다 별도 객체/맵을 들었다면 currentCount 만으로 표현 불가했을 것.)
    for (let i = 0; i < MAX_CONCURRENT; i += 1) tryAcquire();
    const snapshot = currentCount();
    expect(typeof snapshot).toBe("number");
    expect(snapshot).toBe(MAX_CONCURRENT);
    // release 후에도 단일 정수로만 변화 → 요청 데이터 누적 흔적 없음.
    release();
    expect(currentCount()).toBe(MAX_CONCURRENT - 1);
  });

  it("모듈 소스에 요청 데이터 식별자(ticker/runId/decision/state) 보관 흔적 0", async () => {
    // 정적 소스 스캔 — 모듈 스코프에 요청 키워드를 담는 변수/맵이 없음을 회귀 차단.
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const path = fileURLToPath(
      new URL("../concurrencyGate.ts", import.meta.url),
    );
    const src = readFileSync(path, "utf8");
    // 주석(요청 데이터 금지 설명)에는 단어가 등장하므로, 주석 라인을 제거하고 코드만 검사.
    const codeOnly = src
      .split("\n")
      .filter((line) => {
        const t = line.trim();
        return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*");
      })
      .join("\n");
    for (const forbidden of ["ticker", "runId", "decision", "Map<", "new Map", "state"]) {
      expect(codeOnly).not.toContain(forbidden);
    }
  });
});
