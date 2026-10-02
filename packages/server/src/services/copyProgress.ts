export const COPY_PROGRESS_STATUS_ORDER = [
  "READY FOR DEVELOPMENT",
  "In Progress",
  "Code review",
  "Ready for test",
  "In Test",
  "Ready for Deploy",
  "Closed",
  "Done",
] as const;

export interface CopyProgressSortFields {
  status: string;
  statusCategory: string;
  copyStatus: string | null;
  updated: string;
}

export function filterAndSortCopyProgress<T extends CopyProgressSortFields>(items: T[]): T[] {
  const statusOrder = new Map<string, number>(
    COPY_PROGRESS_STATUS_ORDER.map((status, index) => [status, index]),
  );

  return items
    .filter((item) =>
      statusOrder.has(item.status)
      && item.status !== "Rejected"
      && !(item.statusCategory === "done" && item.copyStatus === "Translation - done"),
    )
    .sort((a, b) => {
      const statusDifference = statusOrder.get(b.status)! - statusOrder.get(a.status)!;
      return statusDifference || b.updated.localeCompare(a.updated);
    });
}
