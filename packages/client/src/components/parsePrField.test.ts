import { describe, it, expect } from "vitest";

// Replicate the parsePrField logic for testing (same as server)
type PrState = "open" | "merged" | "declined" | "draft" | "unknown" | "branch";

function parsePrField(raw: string | null | undefined): PrState | null {
  if (!raw || typeof raw !== "string") return null;

  const prStateMatch = raw.match(/"pullrequest"\s*:\s*\{[^}]*"stateCount"\s*:\s*(\d+)[^}]*"state"\s*:\s*"(\w+)"/);
  if (prStateMatch && parseInt(prStateMatch[1], 10) > 0) {
    const normalized = prStateMatch[2].toUpperCase();
    const map: Record<string, PrState> = { OPEN: "open", MERGED: "merged", DECLINED: "declined", DRAFT: "draft" };
    return map[normalized] ?? "unknown";
  }

  const topLevelPr = raw.match(/pullrequest=\{[^}]*stateCount=(\d+)/);
  if (topLevelPr && parseInt(topLevelPr[1], 10) > 0) {
    const stateMatch = raw.match(/"state"\s*:\s*"(\w+)"/);
    if (stateMatch) {
      const normalized = stateMatch[1].toUpperCase();
      const map: Record<string, PrState> = { OPEN: "open", MERGED: "merged", DECLINED: "declined", DRAFT: "draft" };
      return map[normalized] ?? "unknown";
    }
  }

  const branchCountMatch = raw.match(/branch=\{[^}]*count=(\d+)/);
  if (branchCountMatch && parseInt(branchCountMatch[1], 10) > 0) {
    return "branch";
  }

  return null;
}

describe("parsePrField", () => {
  it("returns null for null/undefined/empty", () => {
    expect(parsePrField(null)).toBeNull();
    expect(parsePrField(undefined)).toBeNull();
    expect(parsePrField("")).toBeNull();
  });

  it("parses OPEN state from Jira customfield_10000", () => {
    const raw = '{pullrequest={dataType=pullrequest, state=OPEN, stateCount=1}, json={"cachedValue":{"errors":[],"summary":{"pullrequest":{"overall":{"count":1,"stateCount":1,"state":"OPEN","dataType":"pullrequest","open":true}}}}}}';
    expect(parsePrField(raw)).toBe("open");
  });

  it("parses MERGED state", () => {
    const raw = '{pullrequest={dataType=pullrequest, state=MERGED, stateCount=1}, json={"cachedValue":{"summary":{"pullrequest":{"overall":{"stateCount":1,"state":"MERGED"}}}}}}';
    expect(parsePrField(raw)).toBe("merged");
  });

  it("parses DECLINED state", () => {
    const raw = '{pullrequest={dataType=pullrequest, state=DECLINED, stateCount=1}, json={"cachedValue":{"summary":{"pullrequest":{"overall":{"stateCount":1,"state":"DECLINED"}}}}}}';
    expect(parsePrField(raw)).toBe("declined");
  });

  it("detects branch with no PR", () => {
    const raw = '{branch={count=1, dataType=branch}, json={"cachedValue":{"errors":[],"summary":{"branch":{"overall":{"count":1,"dataType":"branch"}}}}}}';
    expect(parsePrField(raw)).toBe("branch");
  });

  it("returns null when only branch count is 0", () => {
    const raw = '{branch={count=0, dataType=branch}, json={"cachedValue":{"errors":[],"summary":{}}}}';
    expect(parsePrField(raw)).toBeNull();
  });

  it("returns unknown for unrecognized PR state", () => {
    const raw = '{pullrequest={dataType=pullrequest, state=CANCELLED, stateCount=1}, json={"cachedValue":{"summary":{"pullrequest":{"overall":{"stateCount":1,"state":"CANCELLED"}}}}}}';
    expect(parsePrField(raw)).toBe("unknown");
  });

  it("handles non-string values", () => {
    expect(parsePrField(42 as unknown as string)).toBeNull();
    expect(parsePrField({} as unknown as string)).toBeNull();
  });
});
