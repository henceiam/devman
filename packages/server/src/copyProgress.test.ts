import { describe, expect, it } from "vitest";
import { filterAndSortCopyProgress } from "./services/copyProgress.js";

describe("filterAndSortCopyProgress", () => {
  it("sorts by latest workflow status, then most recently updated", () => {
    const items = [
      { key: "A", status: "In Progress", statusCategory: "indeterminate", copyStatus: null, updated: "2026-01-01" },
      { key: "B", status: "Done", statusCategory: "done", copyStatus: "Translation - in progress", updated: "2026-01-01" },
      { key: "C", status: "In Progress", statusCategory: "indeterminate", copyStatus: null, updated: "2026-02-01" },
      { key: "D", status: "Ready for Deploy", statusCategory: "indeterminate", copyStatus: null, updated: "2026-01-01" },
    ];

    expect(filterAndSortCopyProgress(items).map((item) => item.key)).toEqual(["B", "D", "C", "A"]);
  });

  it("excludes rejected issues and done-category issues only when translation is done", () => {
    const items = [
      { key: "A", status: "Closed", statusCategory: "done", copyStatus: "Translation - done", updated: "2026-01-01" },
      { key: "B", status: "Done", statusCategory: "done", copyStatus: null, updated: "2026-01-01" },
      { key: "C", status: "Closed", statusCategory: "done", copyStatus: "Copy - in progress", updated: "2026-01-01" },
      { key: "D", status: "Rejected", statusCategory: "done", copyStatus: null, updated: "2026-01-01" },
    ];

    expect(filterAndSortCopyProgress(items).map((item) => item.key)).toEqual(["B", "C"]);
  });

  it("excludes statuses outside the specified workflow", () => {
    const items = [
      { key: "A", status: "To do", statusCategory: "new", copyStatus: null, updated: "2026-01-01" },
      { key: "B", status: "READY FOR DEVELOPMENT", statusCategory: "new", copyStatus: null, updated: "2026-01-01" },
    ];

    expect(filterAndSortCopyProgress(items).map((item) => item.key)).toEqual(["B"]);
  });
});
