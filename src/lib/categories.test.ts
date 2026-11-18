import { describe, expect, it } from "vitest";
import { breakdown, guessCategory } from "./categories";

describe("categories", () => {
  it("guesses common Nigerian spending", () => {
    expect(guessCategory("Suya and drinks")).toBe("food");
    expect(guessCategory("Bolt to Ikeja")).toBe("transport");
    expect(guessCategory("Wifi for November")).toBe("utilities");
    expect(guessCategory("Random thing")).toBe("other");
  });
  it("sums and sorts a breakdown", () => {
    const b = breakdown([{ category: "food", amount: 300 }, { category: "rent", amount: 700 }, { category: "food", amount: 0 }, { category: "bogus", amount: 0 }]);
    expect(b[0]).toMatchObject({ id: "rent", kobo: 700, pct: 70 });
    expect(b.find((x) => x.id === "food")?.pct).toBe(30);
  });
});
