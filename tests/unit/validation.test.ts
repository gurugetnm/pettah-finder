import { describe, expect, it } from "vitest";
import {
  normalizeText,
  parseQuery,
  slugSchema,
} from "@/lib/validations/search";
import { shopFilterSchema } from "@/lib/validations/filters";
import { testDatabaseUrl } from "@/lib/validations/test-database";
import { directionsUrl } from "@/lib/utils/maps";
import { phoneHref } from "@/lib/validations/contact";
import { cn } from "@/lib/utils/cn";
describe("search input", () => {
  it("normalizes Unicode, repeated spaces and case", () => {
    expect(normalizeText("  ＣＨＡＲＧＥＲ   Cable  ")).toBe("charger cable");
  });
  it("handles empty and absent queries", () => {
    expect(parseQuery(undefined).data).toBe("");
    expect(parseQuery("   ").data).toBe("");
  });
  it("rejects duplicate URL parameters, nonstrings, control characters and oversized input", () => {
    for (const q of [
      ["charger", "fabric"],
      10,
      null,
      "a".repeat(81),
      "abc\u0000",
      "abc\n",
    ])
      expect(parseQuery(q).success).toBe(false);
  });
  it("accepts boundary length and keeps punctuation as literal data", () => {
    expect(parseQuery("a".repeat(80)).success).toBe(true);
    expect(parseQuery("%' OR 1=1 --").success).toBe(true);
  });
  it("enforces the limit after Unicode compatibility expansion", () => {
    expect(parseQuery("\ufb03".repeat(27)).success).toBe(false);
    expect(parseQuery("\ufb03".repeat(26) + "ab").data).toHaveLength(80);
  });
  it("validates route slugs", () => {
    expect(slugSchema.safeParse("1st-cross-street").success).toBe(true);
    for (const slug of [
      "../private",
      "SEA-STREET",
      "sea street",
      "a--b",
      "",
      "a".repeat(81),
    ])
      expect(slugSchema.safeParse(slug).success).toBe(false);
  });
  it("accepts all-category form values and rejects duplicate filters", () => {
    expect(
      shopFilterSchema.parse({ q: " Charger ", category: "", street: "" }),
    ).toEqual({ q: "charger", category: undefined, street: undefined });
    expect(
      shopFilterSchema.safeParse({ category: ["toys", "clothing"] }).success,
    ).toBe(false);
  });
});
describe("isolated database safety", () => {
  const testUrl = "postgresql://test@127.0.0.1:55432/pettah_test";
  it("allows a separate local test database", () => {
    expect(
      testDatabaseUrl(testUrl, "postgresql://dev@127.0.0.1:55432/pettah_dev"),
    ).toBe(testUrl);
  });
  it("rejects missing, remote, dev and option-based schema overrides", () => {
    for (const url of [
      undefined,
      "postgresql://u@remote.example/pettah_test",
      "postgresql://u@localhost/pettah_dev",
      `${testUrl}?options=-csearch_path=public`,
    ])
      expect(() => testDatabaseUrl(url)).toThrow();
    expect(() => testDatabaseUrl(testUrl, testUrl)).toThrow();
    expect(() =>
      testDatabaseUrl(testUrl, testUrl.replace("127.0.0.1", "localhost")),
    ).toThrow();
  });
});
it("encodes directions without inventing coordinates", () => {
  const url = new URL(directionsUrl("Sea Street & surroundings"));
  expect(url.origin).toBe("https://www.google.com");
  expect(url.searchParams.get("api")).toBe("1");
  expect(url.searchParams.get("destination")).toBe(
    "Sea Street & surroundings, Pettah, Colombo, Sri Lanka",
  );
});
it("merges Tailwind overrides", () => {
  expect(cn("px-2", false, "px-4")).toBe("px-4");
});

describe("shop contact URLs", () => {
  it("normalizes a formatted test phone number", () => {
    expect(phoneHref(" +1 (202) 555-0100 ")).toBe("tel:+12025550100");
  });
  it("does not make missing malformed or URI-like values callable", () => {
    for (const value of [
      null,
      "",
      "12",
      "1234;ext=42",
      "javascript:alert(1)",
      "tel:+12025550100",
      "1234567890123456",
      "1234567\n?subject=test",
    ])
      expect(phoneHref(value)).toBeNull();
  });
});
