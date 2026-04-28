import { describe, it, expect } from "vitest";
import { displayStatus, getStatusStyle } from "./statusUtils";

describe("displayStatus", () => {
  it("returns short name for mapped statuses", () => {
    expect(displayStatus("READY FOR DEVELOPMENT")).toBe("RFD");
  });

  it("returns original status when no mapping exists", () => {
    expect(displayStatus("In Progress")).toBe("In Progress");
    expect(displayStatus("Closed")).toBe("Closed");
  });
});

describe("getStatusStyle", () => {
  it("returns cornflowerblue dot for READY FOR DEVELOPMENT", () => {
    const { dotColor } = getStatusStyle("READY FOR DEVELOPMENT");
    expect(dotColor).toBe("cornflowerblue");
  });

  it("returns sandybrown dot for In Progress", () => {
    const { dotColor } = getStatusStyle("In Progress");
    expect(dotColor).toBe("sandybrown");
  });

  it("returns lightgreen dot for Closed", () => {
    const { dotColor } = getStatusStyle("Closed");
    expect(dotColor).toBe("lightgreen");
  });

  it("falls back gracefully for unknown status", () => {
    const { dotColor, bgColor } = getStatusStyle("Some Unknown Status");
    expect(dotColor).toBe("#f87171");
    expect(bgColor).toBe("rgba(248,113,113,0.10)");
  });

  it("bgColor differs from dotColor (has rgba opacity applied)", () => {
    const { dotColor, bgColor } = getStatusStyle("In Progress");
    expect(dotColor).toBe("sandybrown");
    expect(bgColor).toMatch(/^rgba\(/);
  });

  it("white-category statuses get a visible gray dot, not white", () => {
    const { dotColor } = getStatusStyle("To do");
    expect(dotColor).toBe("#9ca3af");
    const { dotColor: dotColor2 } = getStatusStyle("Request");
    expect(dotColor2).toBe("#9ca3af");
  });
});
