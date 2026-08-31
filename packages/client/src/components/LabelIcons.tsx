import { Presentation, Languages } from "lucide-react";

const LABEL_ICONS: Record<string, { icon: React.ReactNode; tooltip: string }> = {
  "should-demo": {
    icon: <Presentation className="h-3.5 w-3.5" strokeWidth={1.5} />,
    tooltip: "Should be demoed to the team",
  },
  "copy": {
    icon: <Languages className="h-3.5 w-3.5" strokeWidth={1.5} />,
    tooltip: "Requires translation work",
  },
};

const LABEL_COLORS: Record<string, string> = {
  "should-demo": "text-violet-500",
  "copy": "text-sky-500",
};

export default function LabelIcons({ labels }: { labels: string[] }) {
  const entries = labels
    .map((l) => ({ config: LABEL_ICONS[l], color: LABEL_COLORS[l], label: l }))
    .filter((e) => e.config);
  if (entries.length === 0) return null;
  return (
    <>
      {entries.map((entry) => (
        <span key={entry.label} title={entry.config.tooltip} className={`shrink-0 ${entry.color}`}>
          {entry.config.icon}
        </span>
      ))}
    </>
  );
}
