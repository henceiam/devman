// PROTOTYPE tooling — floating variant switcher for throwaway UI prototypes (?variant=).
import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";

export interface PrototypeVariant {
  key: string;
  name: string;
}

export default function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: PrototypeVariant[];
  current: string;
}) {
  const [, setSearchParams] = useSearchParams();
  const index = Math.max(0, variants.findIndex((variant) => variant.key === current));

  const go = useCallback(
    (delta: number) => {
      const next = variants[(index + delta + variants.length) % variants.length];
      setSearchParams(
        (params) => {
          params.set("variant", next.key);
          return params;
        },
        { replace: true },
      );
    },
    [index, variants, setSearchParams],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!import.meta.env.DEV) return null;

  const active = variants[index];
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gray-900 px-2 py-1.5 text-sm text-white shadow-xl ring-2 ring-fuchsia-500">
      <button type="button" onClick={() => go(-1)} className="rounded-full px-2 hover:bg-white/20" aria-label="Previous variant">
        ←
      </button>
      <span className="px-2 font-medium">
        <span className="mr-1 text-fuchsia-300">PROTOTYPE</span>
        {active.key} ({active.name})
      </span>
      <button type="button" onClick={() => go(1)} className="rounded-full px-2 hover:bg-white/20" aria-label="Next variant">
        →
      </button>
    </div>
  );
}
