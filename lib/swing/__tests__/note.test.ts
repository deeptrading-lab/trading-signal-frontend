/** AI 노트 고정 스키마 검증(validateSwingNote) — AI 출력은 신뢰하지 않는 입력. */

import { describe, expect, it } from "vitest";
import { NOTE_MAX_ITEMS, validateSwingNote } from "../note";

const TODAY = "2026-11-02";
const item = (over: Record<string, unknown> = {}) => ({
  date: "2026-10-28",
  title: "삼성전자, 3분기 영업이익 12조",
  source: "연합뉴스",
  url: "https://example.com/a",
  category: "earnings",
  direction: "positive",
  materiality: "high",
  summary: "3분기 영업이익이 전년보다 늘었다고 발표했다.",
  ...over,
});

describe("validateSwingNote", () => {
  it("유효 항목은 그대로(공백 정리)", () => {
    const out = validateSwingNote({ items: [item({ title: "  삼성전자,   3분기  " })] }, TODAY);
    expect(out).toEqual([{ ...item(), title: "삼성전자, 3분기" }]);
  });

  it("루트가 {items:[]} 꼴이 아니면 null(노트 실패), 빈 배열은 정상(뉴스 없음)", () => {
    expect(validateSwingNote(null, TODAY)).toBeNull();
    expect(validateSwingNote({ news: [] }, TODAY)).toBeNull();
    expect(validateSwingNote("{}", TODAY)).toBeNull();
    expect(validateSwingNote({ items: [] }, TODAY)).toEqual([]);
  });

  it("enum·필수 필드·URL 스킴이 틀린 항목은 버린다", () => {
    const bad = [
      item({ category: "rumor" }),
      item({ direction: "buy" }),
      item({ materiality: "huge" }),
      item({ source: "" }),
      item({ url: "javascript:alert(1)" }),
      item({ url: "not a url" }),
      item({ title: "x".repeat(201) }),
    ];
    expect(validateSwingNote({ items: bad }, TODAY)).toEqual([]);
  });

  it("최근 30일 밖·하루 넘는 미래·형식 틀린 날짜는 버린다", () => {
    const out = validateSwingNote(
      {
        items: [
          item({ date: "2026-10-03", url: "https://e.com/1" }), // 30일 전 = 경계 포함
          item({ date: "2026-10-02", url: "https://e.com/2" }), // 31일 전
          item({ date: "2026-11-03", url: "https://e.com/3" }), // 하루 뒤(시차 허용)
          item({ date: "2026-11-04", url: "https://e.com/4" }), // 이틀 뒤
          item({ date: "10/28", url: "https://e.com/5" }),
        ],
      },
      TODAY,
    );
    expect(out?.map((x) => x.url)).toEqual(["https://e.com/3", "https://e.com/1"]);
  });

  it("요약에 권유·단정 표현이 있으면 버린다(제목은 기사 원문이라 검사 안 함)", () => {
    const out = validateSwingNote(
      {
        items: [
          item({ url: "https://e.com/1", summary: "지금 매수하세요." }),
          item({ url: "https://e.com/2", summary: "주가가 오를 것으로 보인다." }),
          item({ url: "https://e.com/3", title: "증권가, 목표가 상향" }),
        ],
      },
      TODAY,
    );
    expect(out?.map((x) => x.url)).toEqual(["https://e.com/3"]);
  });

  it("(URL+제목) 중복 제거 → 최신순 → 최대 10건", () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      item({ url: `https://e.com/${i % 12}`, date: `2026-10-${String(10 + i).padStart(2, "0")}` }),
    );
    const out = validateSwingNote({ items: many }, TODAY)!;
    expect(out).toHaveLength(NOTE_MAX_ITEMS);
    expect(new Set(out.map((x) => x.url)).size).toBe(NOTE_MAX_ITEMS);
    expect(out[0].date >= out[out.length - 1].date).toBe(true);
  });

  it("같은 기사에서 뽑은 다른 사실(제목 다름)은 둘 다 남긴다", () => {
    const out = validateSwingNote({ items: [item({ title: "3분기 실적" }), item({ title: "설비투자 계획" })] }, TODAY);
    expect(out).toHaveLength(2);
  });
});
