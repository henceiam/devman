import { describe, expect, it } from "vitest";
import { getMissionShortcut, type MissionShortcutContext } from "./missionShortcuts";

const context: MissionShortcutContext = {
  modalOpen: false,
  dragActive: false,
  focusMode: false,
  focusSupported: true,
  hasCurrentDetail: true,
};

function event(key: string, overrides: Partial<KeyboardEvent> = {}) {
  return { key, target: document.body, ...overrides } as KeyboardEvent;
}

describe("getMissionShortcut", () => {
  it.each([
    ["z", "toggle-focus"],
    ["Z", "toggle-focus"],
    ["r", "refresh"],
    ["R", "refresh"],
    ["d", "toggle-done"],
    ["D", "toggle-done"],
  ] as const)("maps %s to %s", (key, command) => {
    expect(getMissionShortcut(event(key), context)).toBe(command);
  });

  it("allows Shift+Z but rejects Ctrl, Cmd, Alt, repeats, prevented events, and unrelated keys", () => {
    expect(getMissionShortcut(event("Z", { shiftKey: true }), context)).toBe("toggle-focus");
    expect(getMissionShortcut(event("z", { ctrlKey: true }), context)).toBeNull();
    expect(getMissionShortcut(event("z", { metaKey: true }), context)).toBeNull();
    expect(getMissionShortcut(event("z", { altKey: true }), context)).toBeNull();
    expect(getMissionShortcut(event("z", { repeat: true }), context)).toBeNull();
    expect(getMissionShortcut(event("z", { defaultPrevented: true }), context)).toBeNull();
    expect(getMissionShortcut(event("x"), context)).toBeNull();
  });

  it.each(["input", "textarea", "select"])("rejects events from %s elements", (tagName) => {
    expect(getMissionShortcut(event("z", { target: document.createElement(tagName) }), context)).toBeNull();
  });

  it("rejects events from editable elements and their descendants", () => {
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    const descendant = document.createElement("span");
    editable.append(descendant);

    expect(getMissionShortcut(event("r", { target: editable }), context)).toBeNull();
    expect(getMissionShortcut(event("d", { target: descendant }), context)).toBeNull();
  });

  it("suppresses every Mission shortcut while a modal is open", () => {
    const modalContext = { ...context, modalOpen: true };

    expect(getMissionShortcut(event("z"), modalContext)).toBeNull();
    expect(getMissionShortcut(event("r"), modalContext)).toBeNull();
    expect(getMissionShortcut(event("d"), modalContext)).toBeNull();
  });

  it("suppresses Focus entry during a drag, on mobile, or without current detail", () => {
    expect(getMissionShortcut(event("z"), { ...context, dragActive: true })).toBeNull();
    expect(getMissionShortcut(event("z"), { ...context, focusSupported: false })).toBeNull();
    expect(getMissionShortcut(event("z"), { ...context, hasCurrentDetail: false })).toBeNull();
  });

  it("allows Focus exit during replacement-detail loading but not during a drag", () => {
    const loadingInFocus = { ...context, focusMode: true, hasCurrentDetail: false };

    expect(getMissionShortcut(event("z"), loadingInFocus)).toBe("toggle-focus");
    expect(getMissionShortcut(event("z"), { ...loadingInFocus, dragActive: true })).toBeNull();
  });
});
