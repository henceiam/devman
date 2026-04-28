/** Short display names for verbose Jira statuses */
const STATUS_DISPLAY_NAMES: Record<string, string> = {
  "READY FOR DEVELOPMENT": "RFD",
};

export function displayStatus(status: string): string {
  return STATUS_DISPLAY_NAMES[status] ?? status;
}

export const STATUS_COLORS: Record<string, string> = {
  "Request": "bg-white text-gray-600 border border-gray-200",
  "To do": "bg-white text-gray-600 border border-gray-200",
  "To Refine": "bg-blue-100 text-blue-700",
  "In Design": "bg-purple-100 text-purple-700",
  "Ready for Design": "bg-purple-100 text-purple-700",
  "READY FOR DEVELOPMENT": "bg-blue-200 text-blue-800",
  "To Investigate": "bg-blue-200 text-blue-800",
  "In Progress": "bg-orange-100 text-orange-700",
  "Under investigation": "bg-orange-100 text-orange-700",
  "On Hold": "bg-orange-100 text-orange-700",
  "Code review": "bg-yellow-100 text-yellow-700",
  "Ready for test": "bg-yellow-100 text-yellow-700",
  "In Test": "bg-yellow-100 text-yellow-700",
  "Waiting for support": "bg-yellow-100 text-yellow-700",
  "Waiting for customer": "bg-yellow-100 text-yellow-700",
  "Ready for Deploy": "bg-lime-100 text-lime-700",
  "Closed": "bg-green-100 text-green-700",
  "Rejected": "bg-gray-200 text-gray-500",
};

export const COPY_STATUS_COLORS: Record<string, string> = {
  "Copy - ready to start": "bg-sky-100 text-sky-700",
  "Copy - in progress": "bg-sky-100 text-sky-700",
  "Translation - ready to start": "bg-yellow-100 text-yellow-700",
  "Translation - in progress": "bg-yellow-100 text-yellow-700",
  "Translation - done": "bg-green-100 text-green-700",
};

export function statusBadge(status: string) {
  const cls = STATUS_COLORS[status] ?? "bg-red-100 text-red-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{displayStatus(status)}</span>;
}

/**
 * Full CSS named colors per status, matching domain-logic.instructions.md.
 * "white"-statuses use a gray dot (visible on white bg) with a near-invisible tint.
 */
const STATUS_DOT_COLOR: Record<string, string> = {
  "Request":               "#9ca3af", // gray-400 — white would be invisible
  "To do":                 "#9ca3af",
  "To Refine":             "lightsteelblue",
  "In Design":             "violet",
  "Ready for Design":      "violet",
  "READY FOR DEVELOPMENT": "cornflowerblue",
  "To Investigate":        "cornflowerblue",
  "In Progress":           "sandybrown",
  "Under investigation":   "sandybrown",
  "On Hold":               "sandybrown",
  "Code review":           "#d4b44a", // darkened khaki — raw khaki is near-white
  "Ready for test":        "#d4b44a",
  "In Test":               "#d4b44a",
  "Waiting for support":   "#d4b44a",
  "Waiting for customer":  "#d4b44a",
  "Ready for Deploy":      "yellowgreen",
  "Closed":                "lightgreen",
  "Rejected":              "silver",
};

/** Pre-computed rgba tints for card backgrounds (derived from STATUS_DOT_COLOR values) */
const STATUS_BG_TINT: Record<string, string> = {
  "Request":               "rgba(156,163,175,0.08)",
  "To do":                 "rgba(156,163,175,0.08)",
  "To Refine":             "rgba(176,196,222,0.18)",
  "In Design":             "rgba(238,130,238,0.12)",
  "Ready for Design":      "rgba(238,130,238,0.12)",
  "READY FOR DEVELOPMENT": "rgba(100,149,237,0.14)",
  "To Investigate":        "rgba(100,149,237,0.14)",
  "In Progress":           "rgba(244,164,96,0.16)",
  "Under investigation":   "rgba(244,164,96,0.16)",
  "On Hold":               "rgba(244,164,96,0.16)",
  "Code review":           "rgba(212,180,74,0.14)",
  "Ready for test":        "rgba(212,180,74,0.14)",
  "In Test":               "rgba(212,180,74,0.14)",
  "Waiting for support":   "rgba(212,180,74,0.14)",
  "Waiting for customer":  "rgba(212,180,74,0.14)",
  "Ready for Deploy":      "rgba(154,205,50,0.14)",
  "Closed":                "rgba(144,238,144,0.16)",
  "Rejected":              "rgba(192,192,192,0.14)",
};

const FALLBACK_DOT = "#f87171";
const FALLBACK_BG  = "rgba(248,113,113,0.10)";

export function getStatusStyle(status: string): { dotColor: string; bgColor: string } {
  return {
    dotColor: STATUS_DOT_COLOR[status] ?? FALLBACK_DOT,
    bgColor:  STATUS_BG_TINT[status]  ?? FALLBACK_BG,
  };
}

