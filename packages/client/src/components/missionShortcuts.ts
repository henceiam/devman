export type MissionShortcut = "toggle-focus" | "refresh" | "toggle-done";

export interface MissionShortcutContext {
  modalOpen: boolean;
  dragActive: boolean;
  focusMode: boolean;
  focusSupported: boolean;
  hasCurrentDetail: boolean;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])") !== null
    || (target instanceof HTMLElement && target.isContentEditable);
}

export function getMissionShortcut(event: KeyboardEvent, context: MissionShortcutContext): MissionShortcut | null {
  if (
    event.defaultPrevented
    || event.repeat
    || event.ctrlKey
    || event.metaKey
    || event.altKey
    || context.modalOpen
    || isEditableTarget(event.target)
  ) return null;

  const key = event.key.toLowerCase();
  if (key === "r") return "refresh";
  if (key === "d") return "toggle-done";
  if (key !== "z" || context.dragActive || !context.focusSupported) return null;
  if (!context.focusMode && !context.hasCurrentDetail) return null;
  return "toggle-focus";
}
