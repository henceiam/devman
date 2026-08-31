import { AGE_COLORS } from "./statusUtils";

function ageInfo(dateStr: string): { color: string; label: string } {
  const ms = Date.now() - new Date(dateStr).getTime();
  const hours = ms / 3_600_000;
  if (hours < 1) return { color: AGE_COLORS.fresh, label: "<1h" };
  if (hours < 24) return { color: AGE_COLORS.fresh, label: `${Math.floor(hours)}h` };
  const days = hours / 24;
  if (days < 3) return { color: AGE_COLORS.warm, label: `${Math.floor(days)}d` };
  if (days < 7) return { color: AGE_COLORS.aging, label: `${Math.floor(days)}d` };
  const weeks = Math.floor(days / 7);
  if (weeks < 10) return { color: AGE_COLORS.stale, label: `${weeks}w` };
  return { color: AGE_COLORS.stale, label: `${Math.floor(days)}d` };
}

export function PrAgeBullet({ createdAt, updatedAt }: { createdAt: string; updatedAt: string }) {
  const created = ageInfo(createdAt);
  const updated = ageInfo(updatedAt);
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`Created ${created.label} ago · Updated ${updated.label} ago`}
    >
      <span className="relative inline-flex items-center justify-center align-middle" style={{ width: 18, height: 18 }}>
        <span
          className="absolute rounded-full border-2"
          style={{ width: 18, height: 18, borderColor: updated.color, backgroundColor: "transparent" }}
        />
        <span
          className="absolute rounded-full"
          style={{ width: 8, height: 8, backgroundColor: created.color }}
        />
      </span>
      <span className="text-xs font-medium text-gray-600">{created.label}</span>
    </span>
  );
}
