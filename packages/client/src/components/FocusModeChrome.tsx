import type { ReactNode } from "react";

interface FocusModeChromeProps {
  identity: ReactNode;
  controls: ReactNode;
  onExit: () => void;
}

export default function FocusModeChrome({ identity, controls, onExit }: FocusModeChromeProps) {
  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-16 items-center gap-5 border-b border-gray-200 bg-white/95 px-6 py-3 pr-44 backdrop-blur">
        <div className="min-w-0 flex-1">{identity}</div>
        {controls}
      </header>
      <button
        type="button"
        onClick={onExit}
        className="fixed right-4 top-4 z-40 flex items-center gap-2 rounded-full border border-gray-300 bg-white/95 px-3 py-2 text-xs font-medium text-gray-600 shadow-lg backdrop-blur hover:border-gray-400 hover:text-gray-900"
        aria-label="Exit Focus mode"
        aria-keyshortcuts="Z"
      >
        <span>Exit Focus mode</span>
        <kbd aria-hidden="true" className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5">Z</kbd>
      </button>
    </>
  );
}
