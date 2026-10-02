import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, type CopyProgressIssue } from "../api/client";
import CopyProgressPage from "./CopyProgressPage";

const issue: CopyProgressIssue = {
  key: "EBBACKLOG-123",
  summary: "Review localized copy",
  status: "In Progress",
  copyStatus: null,
  epicShortName: "Checkout",
  updated: "2026-10-01T10:00:00.000Z",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CopyProgressPage", () => {
  it("loads the Jira status table on open and displays unset copy status", async () => {
    const getCopyProgress = vi.spyOn(api.jira, "getCopyProgress").mockResolvedValue({ issues: [issue] });
    render(<CopyProgressPage />);

    expect(await screen.findByText("Review localized copy")).toBeInTheDocument();
    expect(screen.getByText("EBBACKLOG-123")).toHaveAttribute("href", expect.stringContaining("/browse/EBBACKLOG-123"));
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.getByText("Checkout")).toBeInTheDocument();
    expect(getCopyProgress).toHaveBeenCalledTimes(1);
  });

  it("refreshes only when requested and reports load errors", async () => {
    const getCopyProgress = vi.spyOn(api.jira, "getCopyProgress")
      .mockResolvedValueOnce({ issues: [issue] })
      .mockRejectedValueOnce(new Error("Jira unavailable"));
    render(<CopyProgressPage />);

    await screen.findByText("Review localized copy");
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Jira unavailable");
    expect(getCopyProgress).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Review localized copy")).toBeInTheDocument();
  });
});
