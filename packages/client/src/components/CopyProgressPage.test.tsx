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

  it("loads an issue's keys on expansion and keeps reference-copy columns distinct", async () => {
    vi.spyOn(api.jira, "getCopyProgress").mockResolvedValue({ issues: [issue] });
    const keyDetails = {
      state: "ready",
      rows: [
        {
          key: "checkout.title",
          referenceCopies: [
            { header: "Copy", value: "Continue" },
            { header: "Copy - clinical", value: "Continue to checkout" },
          ],
          comment: "Shown on the payment step",
        },
        {
          key: "checkout.confirm",
          referenceCopies: [{ header: "Copy", value: "Confirm" }],
          comment: "Submit payment",
        },
      ],
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => keyDetails,
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<CopyProgressPage />);

    await screen.findByText("Review localized copy");
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Show translation keys for EBBACKLOG-123" }));

    expect(await screen.findAllByText("checkout.title")).toHaveLength(2);
    expect(screen.getByText("Continue")).toBeInTheDocument();
    expect(screen.getByText("Continue to checkout")).toBeInTheDocument();
    expect(screen.getByText("Shown on the payment step")).toBeInTheDocument();
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.getByText("Copy - clinical")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "checkout.confirm" }));
    expect(await screen.findByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Submit payment")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a successful empty state without treating it as a load error", async () => {
    vi.spyOn(api.jira, "getCopyProgress").mockResolvedValue({ issues: [issue] });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ state: "empty" }),
    })));
    render(<CopyProgressPage />);

    await screen.findByText("Review localized copy");
    fireEvent.click(screen.getByRole("button", { name: "Show translation keys for EBBACKLOG-123" }));

    expect(await screen.findByText("No translation keys in Jira")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a fetch error and retries without losing the issue-level list", async () => {
    vi.spyOn(api.jira, "getCopyProgress").mockResolvedValue({ issues: [issue] });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ error: "Jira unavailable" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: "ready",
          rows: [{
            key: "checkout.title",
            referenceCopies: [{ header: "Copy", value: "Continue" }],
            comment: "",
          }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<CopyProgressPage />);

    await screen.findByText("Review localized copy");
    fireEvent.click(screen.getByRole("button", { name: "Show translation keys for EBBACKLOG-123" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Jira unavailable");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Continue")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("warns when Jira content is present but not a usable key table", async () => {
    vi.spyOn(api.jira, "getCopyProgress").mockResolvedValue({ issues: [issue] });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        state: "unstructured",
        content: { type: "doc", content: [{ type: "paragraph", content: [{ text: "Raw Jira text" }] }] },
      }),
    })));
    render(<CopyProgressPage />);

    await screen.findByText("Review localized copy");
    fireEvent.click(screen.getByRole("button", { name: "Show translation keys for EBBACKLOG-123" }));

    expect(await screen.findByText("Jira translation keys content is not a usable table.")).toBeInTheDocument();
    expect(screen.getByText(/Raw Jira text/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
