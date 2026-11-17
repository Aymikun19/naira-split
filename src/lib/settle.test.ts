import { describe, expect, it } from "vitest";
import { balances, settleUp, splitByPercent, splitEvenly, splitExact, toKobo } from "./settle";

describe("splitEvenly", () => {
  it("splits exactly and distributes leftover kobo", () => {
    const s = splitEvenly(1000, ["a", "b", "c"]);
    expect(s.map((x) => x.kobo)).toEqual([334, 333, 333]);
    expect(s.reduce((t, x) => t + x.kobo, 0)).toBe(1000);
  });
  it("rejects empty groups and bad amounts", () => {
    expect(() => splitEvenly(100, [])).toThrow();
    expect(() => splitEvenly(0, ["a"])).toThrow();
    expect(() => splitEvenly(10.5, ["a"])).toThrow();
  });
});

describe("balances + settleUp", () => {
  it("settles a simple dinner", () => {
    // Ada pays ₦9,000 dinner for Ada, Bayo, Chi
    const b = balances(["ada", "bayo", "chi"], [{ paidBy: "ada", amount: 900000, shares: splitEvenly(900000, ["ada", "bayo", "chi"]) }]);
    expect(b.get("ada")).toBe(600000);
    expect(settleUp(b)).toEqual([
      { from: "bayo", to: "ada", kobo: 300000 },
      { from: "chi", to: "ada", kobo: 300000 },
    ]);
  });

  it("nets out offsetting debts", () => {
    const b = balances(
      ["a", "b"],
      [
        { paidBy: "a", amount: 1000, shares: [{ memberId: "b", kobo: 1000 }] },
        { paidBy: "b", amount: 400, shares: [{ memberId: "a", kobo: 400 }] },
      ],
    );
    expect(settleUp(b)).toEqual([{ from: "b", to: "a", kobo: 600 }]);
  });

  it("always balances to zero and uses at most n-1 transfers", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const expenses = [
      { paidBy: "a", amount: 5000, shares: splitEvenly(5000, ids) },
      { paidBy: "c", amount: 1234, shares: splitEvenly(1234, ["b", "c", "d"]) },
      { paidBy: "e", amount: 999, shares: splitEvenly(999, ["a", "e"]) },
    ];
    const b = balances(ids, expenses);
    expect([...b.values()].reduce((s, v) => s + v, 0)).toBe(0);
    const t = settleUp(b);
    expect(t.length).toBeLessThanOrEqual(ids.length - 1);
    for (const x of t) {
      b.set(x.from, b.get(x.from)! + x.kobo);
      b.set(x.to, b.get(x.to)! - x.kobo);
    }
    expect([...b.values()].every((v) => v === 0)).toBe(true);
  });
});

describe("toKobo", () => {
  it("parses naira strings", () => {
    expect(toKobo("₦1,250.50")).toBe(125050);
    expect(toKobo("3000")).toBe(300000);
  });
});

describe("custom splits", () => {
  it("accepts exact amounts that add up", () => {
    expect(splitExact(1000, [{ memberId: "a", kobo: 700 }, { memberId: "b", kobo: 300 }, { memberId: "c", kobo: 0 }])).toHaveLength(2);
  });
  it("rejects exact amounts that do not add up", () => {
    expect(() => splitExact(1000, [{ memberId: "a", kobo: 600 }])).toThrow(/add up/);
  });
  it("splits by percent and keeps every kobo", () => {
    const s = splitByPercent(1000, [{ memberId: "a", pct: 33.33 }, { memberId: "b", pct: 33.33 }, { memberId: "c", pct: 33.34 }]);
    expect(s.reduce((n, x) => n + x.kobo, 0)).toBe(1000);
  });
  it("rejects percentages that do not total 100", () => {
    expect(() => splitByPercent(1000, [{ memberId: "a", pct: 50 }])).toThrow(/100%/);
  });
});
