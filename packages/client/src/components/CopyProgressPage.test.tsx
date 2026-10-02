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
          matchState: "matched",
          locales: [
            {
              locale: "en-GB",
              state: "found",
              value: "Continue in English",
              overrides: [{ environment: "prod", value: "Continue for production" }],
            },
            {
              locale: "fr-FR",
              state: "missing",
              overrides: [{ environment: "stage", value: "Continuer en préproduction" }],
            },
          ],
        },
        {
          key: "checkout.confirm",
          referenceCopies: [{ header: "Copy", value: "Confirm" }],
          comment: "Submit payment",
          matchState: "matched",
          locales: [{
            locale: "en-GB",
            state: "found",
            value: "Confirm in English",
            overrides: [],
          }],
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

    const titleKey = await screen.findByRole("button", { name: "checkout.title" });
    expect(screen.getByRole("button", { name: "checkout.confirm" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("img", { name: "Reference copy Copy: Present" })).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Reference copy Copy - clinical: Present" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "en-GB: Present, 1 override(s)" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "fr-FR: Missing, 1 override(s)" })).toBeInTheDocument();
    expect(screen.getByText("1 missing translations")).toBeInTheDocument();
    expect(screen.queryByText("Continue in English")).not.toBeInTheDocument();

    fireEvent.click(titleKey);
    const details = screen.getByRole("region", { name: "Details for checkout.title" });
    expect(details).toHaveTextContent("Continue");
    expect(details).toHaveTextContent("Continue to checkout");
    expect(details).toHaveTextContent("Shown on the payment step");
    expect(screen.getByRole("rowheader", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Copy - clinical" })).toBeInTheDocument();
    expect(screen.getByText("Continue in English")).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "fr-FR" })).toBeInTheDocument();
    expect(screen.getByText("Missing translation")).toBeInTheDocument();
    expect(screen.getByText("prod")).toBeInTheDocument();
    expect(screen.getByText("Continue for production")).toBeInTheDocument();
    expect(screen.getByText("stage")).toBeInTheDocument();
    expect(screen.getByText("Continuer en préproduction")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "checkout.confirm" }));
    expect(await screen.findByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Submit payment")).toBeInTheDocument();
    expect(screen.getByText("Confirm in English")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renders empty strings, missing values, and unmatched keys as distinct states", async () => {
    vi.spyOn(api.jira, "getCopyProgress").mockResolvedValue({ issues: [issue] });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        state: "ready",
        rows: [
          {
            key: "checkout.title",
            referenceCopies: [{ header: "Copy", value: "Continue" }],
            comment: "",
            matchState: "matched",
            locales: [
              { locale: "en-GB", state: "found", value: "", overrides: [] },
              { locale: "fr-FR", state: "missing", overrides: [] },
            ],
          },
          {
            key: "checkout.unregistered",
            referenceCopies: [{ header: "Copy", value: "Not registered" }],
            comment: "",
            matchState: "unmatched",
            locales: [
              { locale: "en-GB", state: "missing", overrides: [] },
              { locale: "fr-FR", state: "missing", overrides: [] },
            ],
          },
        ],
      }),
    })));
    render(<CopyProgressPage />);

    await screen.findByText("Review localized copy");
    fireEvent.click(screen.getByRole("button", { name: "Show translation keys for EBBACKLOG-123" }));
    expect(await screen.findByRole("img", { name: "en-GB: Empty string" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "fr-FR: Missing" })).toBeInTheDocument();
    expect(screen.getByText("Key not in repo")).toBeInTheDocument();
    expect(screen.getByText("1 not in translations repo")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand keys with problems" }));
    expect(screen.getByText("(empty string)")).toBeInTheDocument();
    expect(screen.getByText("Missing translation")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Environment overrides" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No exact key match in the translations repository.");
  });

  it("hides unsupported locales from the overview but shows existing values in details", async () => {
    vi.spyOn(api.jira, "getCopyProgress").mockResolvedValue({ issues: [issue] });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        state: "ready",
        rows: [{
          key: "checkout.title",
          referenceCopies: [{ header: "Copy", value: "Continue" }],
          comment: "",
          matchState: "matched",
          locales: [
            { locale: "da-DK", state: "missing", overrides: [] },
            { locale: "en-GB", state: "found", value: "Continue", overrides: [] },
            { locale: "nl-NL", state: "found", value: "Doorgaan", overrides: [] },
            { locale: "uk-UA", state: "missing", overrides: [] },
          ],
        }],
      }),
    })));
    render(<CopyProgressPage />);

    await screen.findByText("Review localized copy");
    fireEvent.click(screen.getByRole("button", { name: "Show translation keys for EBBACKLOG-123" }));

    expect(await screen.findByText("No missing values")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /^(da-DK|nl-NL|uk-UA)/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "checkout.title" }));
    expect(screen.queryByRole("rowheader", { name: "nl-NL" })).not.toBeInTheDocument();
    expect(screen.getByText("Unsupported locales with values (1)")).toBeInTheDocument();
    expect(screen.getByText(/Doorgaan/)).toBeInTheDocument();
    expect(screen.queryByText("da-DK")).not.toBeInTheDocument();
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
            matchState: "matched",
            locales: [{
              locale: "en-GB",
              state: "found",
              value: "Continue in English",
              overrides: [],
            }],
          }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<CopyProgressPage />);

    await screen.findByText("Review localized copy");
    fireEvent.click(screen.getByRole("button", { name: "Show translation keys for EBBACKLOG-123" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Jira unavailable");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("button", { name: "checkout.title" })).toBeInTheDocument();
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
