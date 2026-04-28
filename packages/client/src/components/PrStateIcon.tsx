import type { PrState } from "../api/client";

const PR_ICONS: Record<PrState, { icon: string; label: string; className: string }> = {
  open: { icon: "👁", label: "PR Open", className: "text-blue-600" },
  merged: { icon: "✓", label: "PR Merged", className: "text-purple-600 font-bold" },
  declined: { icon: "⚠", label: "PR Declined", className: "text-red-500" },
  draft: { icon: "📄", label: "PR Draft", className: "text-gray-400" },
  unknown: { icon: "❓", label: "PR Unknown", className: "text-gray-400" },
  branch: { icon: "⎇", label: "Branch (no PR)", className: "text-teal-500" },
};

interface PrStateIconProps {
  state: PrState;
  size?: "sm" | "md";
}

export default function PrStateIcon({ state, size = "sm" }: PrStateIconProps) {
  const { icon, label, className } = PR_ICONS[state];
  const sizeClass = size === "sm" ? "text-xs" : "text-sm";
  return (
    <span title={label} className={`shrink-0 leading-none ${sizeClass} ${className}`}>
      {icon}
    </span>
  );
}
