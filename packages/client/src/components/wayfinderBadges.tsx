import { Search, FlaskConical, MessageSquare, ListChecks, Circle } from "lucide-react";
import type { WayfinderTicketType } from "../api/client";

const TYPE_META: Record<NonNullable<WayfinderTicketType>, { label: string; icon: React.ReactNode; color: string }> = {
  research: { label: "Research", icon: <Search className="h-3 w-3" />, color: "bg-sky-100 text-sky-700" },
  prototype: { label: "Prototype", icon: <FlaskConical className="h-3 w-3" />, color: "bg-violet-100 text-violet-700" },
  grilling: { label: "Grilling", icon: <MessageSquare className="h-3 w-3" />, color: "bg-amber-100 text-amber-700" },
  task: { label: "Task", icon: <ListChecks className="h-3 w-3" />, color: "bg-gray-200 text-gray-700" },
};

const UNKNOWN_TYPE_META = { label: "Unknown", icon: <Circle className="h-3 w-3" />, color: "bg-gray-100 text-gray-500" };

export function wayfinderTypeMeta(type: WayfinderTicketType): { label: string; icon: React.ReactNode; color: string } {
  return type ? TYPE_META[type] : UNKNOWN_TYPE_META;
}

export function WayfinderAvatar({ name, avatarUrl, size = "h-5 w-5" }: { name: string; avatarUrl: string | null; size?: string }) {
  if (name === "Unassigned") return <span className="shrink-0 text-[10px] italic text-gray-400">Unassigned</span>;
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} title={name} className={`${size} shrink-0 rounded-full`} />;
  }
  return (
    <span title={name} className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-medium text-gray-600`}>
      {name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
    </span>
  );
}
