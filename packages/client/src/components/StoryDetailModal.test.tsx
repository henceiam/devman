import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, type StoryDetailResponse } from "../api/client";
import StoryDetailModal from "./StoryDetailModal";

function makeDetail(overrides: Partial<StoryDetailResponse> = {}): StoryDetailResponse {
  return {
    key: "EBBACKLOG-123",
    summary: "A story with a table",
    status: "To do",
    statusCategory: "new",
    issuetype: "Story",
    description: null,
    acceptanceCriteria: null,
    implementationPlan: null,
    subtasks: [],
    prState: null,
    labels: [],
    copy: { status: null, translationKeys: null, translationKeysState: "empty" },
    ...overrides,
  };
}

const paragraph = (text: string, marks?: Array<{ type: string }>) => ({
  type: "paragraph",
  content: [{ type: "text", text, ...(marks ? { marks } : {}) }],
});

const emptyParagraph = () => ({ type: "paragraph" });

const tableDescription = {
  type: "doc",
  version: 1,
  content: [
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [paragraph("Key")] },
            { type: "tableHeader", content: [paragraph("Copy")] },
            { type: "tableHeader", content: [paragraph("Comment")] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [paragraph("checkout.title")] },
            { type: "tableCell", content: [paragraph("Choose delivery method", [{ type: "strong" }])] },
            { type: "tableCell", content: [emptyParagraph()] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [emptyParagraph()] },
            { type: "tableCell", content: [emptyParagraph()] },
            { type: "tableCell", content: [emptyParagraph()] },
          ],
        },
      ],
    },
  ],
};

function renderModalWithDetail(detail: StoryDetailResponse) {
  vi.spyOn(api.missions, "getStoryDetail").mockResolvedValue(detail);
  vi.spyOn(api.missions, "getStoryComments").mockReturnValue(new Promise(() => {}));
  return render(<StoryDetailModal storyKey={detail.key} hideDone={false} onClose={() => {}} />);
}

async function openDetailsTab(summary: string) {
  await screen.findByText(summary);
  fireEvent.click(screen.getByRole("button", { name: "Details" }));
}

describe("StoryDetailModal ADF table rendering", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders a table ADF in the description as a real <table> with Key/Copy/Comment header cells", async () => {
    renderModalWithDetail(makeDetail({ description: tableDescription }));
    await openDetailsTab("A story with a table");

    const table = document.querySelector("table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveClass("table-fixed");

    const headerCells = document.querySelectorAll("thead th");
    expect([...headerCells].map((th) => th.textContent)).toEqual(["Key", "Copy", "Comment"]);
  });

  it("renders body cell content and keeps blank cells visibly blank", async () => {
    renderModalWithDetail(makeDetail({ description: tableDescription }));
    await openDetailsTab("A story with a table");

    const bodyRows = document.querySelectorAll("tbody tr");
    expect(bodyRows).toHaveLength(2);
    expect(bodyRows[0].querySelectorAll("td")).toHaveLength(3);
    expect(bodyRows[0]).toHaveTextContent("checkout.title");

    // The blank Comment cell in row 1 and the entire all-blank row 2 stay blank
    // (a lone "&nbsp;" or empty text) — never "Not set".
    const blankCell = bodyRows[0].querySelectorAll("td")[2];
    expect(blankCell.textContent).toMatch(/^\u00a0?$/);
    expect(blankCell).not.toHaveTextContent("Not set");

    const allBlankRow = bodyRows[1];
    for (const td of allBlankRow.querySelectorAll("td")) {
      expect(td.textContent).toMatch(/^\u00a0?$/);
    }
    expect(allBlankRow).not.toHaveTextContent("Not set");
  });

  it("applies ADF marks (strong) inside table cells", async () => {
    renderModalWithDetail(makeDetail({ description: tableDescription }));
    await openDetailsTab("A story with a table");

    const strong = document.querySelector("tbody td strong");
    expect(strong).toBeInTheDocument();
    expect(strong).toHaveTextContent("Choose delivery method");
  });

  it("does not let a column position drive styling (no font-mono on the first column)", async () => {
    renderModalWithDetail(makeDetail({ description: tableDescription }));
    await openDetailsTab("A story with a table");

    const firstCell = document.querySelectorAll("tbody tr")[0].querySelectorAll("td")[0];
    expect(firstCell).not.toHaveClass("font-mono");
  });
});
