import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, type AdfDocument, type StoryDetailResponse } from "../api/client";
import StoryDetailModal from "./StoryDetailModal";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

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

async function openCopyTab(summary: string) {
  await screen.findByText(summary);
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
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

describe("StoryDetailModal Copy tab", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is absent for a non-eligible issue (no copy label)", async () => {
    renderModalWithDetail(makeDetail({ labels: [] }));
    await screen.findByText("A story with a table");

    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
  });

  it("is absent for an EBBACKLOG issue with a non-exact copy label", async () => {
    renderModalWithDetail(makeDetail({ labels: ["copywriting"] }));
    await screen.findByText("A story with a table");

    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
  });

  it("is absent for a copy-labelled issue outside EBBACKLOG", async () => {
    renderModalWithDetail(makeDetail({ key: "SUPPORT-42", labels: ["copy"] }));
    await screen.findByText("A story with a table");

    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
  });

  it("is present for an eligible issue and shows the Copy & Translations badge", async () => {
    renderModalWithDetail(makeDetail({
      labels: ["copy"],
      copy: { status: "Translation - in progress", translationKeys: null, translationKeysState: "empty" },
    }));
    await openCopyTab("A story with a table");

    expect(screen.getByText("Copy & Translations")).toBeInTheDocument();
    expect(screen.getByText("Current Jira workflow status")).toBeInTheDocument();
    expect(screen.getByText("Translation - in progress")).toHaveClass("bg-yellow-100", "text-yellow-700");
  });

  it("is present for the copy-clinical label and shows Not set when the status is null", async () => {
    renderModalWithDetail(makeDetail({ labels: ["copy-clinical"] }));
    await openCopyTab("A story with a table");

    expect(screen.getByText("Not set")).toBeInTheDocument();
  });

  it("renders initialized translation keys as a table", async () => {
    renderModalWithDetail(makeDetail({
      labels: ["copy"],
      copy: {
        status: null,
        translationKeys: tableDescription as AdfDocument,
        translationKeysState: "initialized",
      },
    }));
    await openCopyTab("A story with a table");

    expect(screen.getByText("Translation keys")).toBeInTheDocument();
    expect(screen.getByText("Read-only content from Jira")).toBeInTheDocument();
    const headerCells = document.querySelectorAll("thead th");
    expect([...headerCells].map((th) => th.textContent)).toEqual(["Key", "Copy", "Comment"]);
    expect(screen.getByText("checkout.title")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create translation table" })).not.toBeInTheDocument();
  });

  it("shows the empty-state action when translation keys are empty", async () => {
    renderModalWithDetail(makeDetail({ labels: ["copy"] }));
    await openCopyTab("A story with a table");

    expect(screen.getByText("No translation keys yet")).toBeInTheDocument();
    expect(screen.getByText(/Start with the standard Key, Copy, and Comment table/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create translation table" })).toBeEnabled();
  });

  it("disables the action and shows Creating table… while saving", async () => {
    const request = deferred<never>();
    vi.spyOn(api.missions, "initializeTranslationKeys").mockReturnValue(request.promise);
    renderModalWithDetail(makeDetail({ labels: ["copy"] }));
    await openCopyTab("A story with a table");

    fireEvent.click(screen.getByRole("button", { name: "Create translation table" }));

    const action = screen.getByRole("button", { name: /Creating table…/ });
    expect(action).toBeDisabled();
    expect(screen.getByText("No translation keys yet")).toBeInTheDocument();
    expect(document.querySelector("table")).not.toBeInTheDocument();
  });

  it("replaces the empty state with the returned table on success", async () => {
    vi.spyOn(api.missions, "initializeTranslationKeys").mockResolvedValue({
      outcome: "initialized",
      copy: {
        status: "Copy - ready to start",
        translationKeys: tableDescription as AdfDocument,
        translationKeysState: "initialized",
      },
    });
    renderModalWithDetail(makeDetail({ labels: ["copy"] }));
    await openCopyTab("A story with a table");

    fireEvent.click(screen.getByRole("button", { name: "Create translation table" }));

    expect(await screen.findByText("checkout.title")).toBeInTheDocument();
    expect(screen.queryByText("No translation keys yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Translation keys changed in Jira")).not.toBeInTheDocument();
    // The refreshed authoritative copy includes the status, now shown as a badge
    expect(screen.getByText("Copy - ready to start")).toBeInTheDocument();
    expect(api.missions.initializeTranslationKeys).toHaveBeenCalledWith("EBBACKLOG-123");
  });

  it("shows the conflict notice above the refreshed content on a typed 409", async () => {
    vi.spyOn(api.missions, "initializeTranslationKeys").mockRejectedValue(
      new ApiError("Conflict", 409, {
        outcome: "already-initialized",
        copy: {
          status: null,
          translationKeys: tableDescription as AdfDocument,
          translationKeysState: "initialized",
        },
      }),
    );
    renderModalWithDetail(makeDetail({ labels: ["copy"] }));
    await openCopyTab("A story with a table");

    fireEvent.click(screen.getByRole("button", { name: "Create translation table" }));

    expect(await screen.findByText("Translation keys changed in Jira")).toBeInTheDocument();
    expect(screen.getByText(/The latest Jira content is shown below\. Nothing was overwritten\./)).toBeInTheDocument();
    expect(screen.getByText("checkout.title")).toBeInTheDocument();
    expect(screen.queryByText("No translation keys yet")).not.toBeInTheDocument();
  });

  it("shows the red inline error and keeps the action enabled on a non-conflict failure", async () => {
    vi.spyOn(api.missions, "initializeTranslationKeys").mockRejectedValue(
      new ApiError("Server exploded", 500, { error: "Server exploded" }),
    );
    renderModalWithDetail(makeDetail({ labels: ["copy"] }));
    await openCopyTab("A story with a table");

    fireEvent.click(screen.getByRole("button", { name: "Create translation table" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t create the table. Jira did not save the change. Try again.",
    );
    expect(screen.getByText("No translation keys yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create translation table" })).toBeEnabled();
    expect(screen.queryByText("Translation keys changed in Jira")).not.toBeInTheDocument();
  });

  it("does not select the Copy tab automatically for an eligible issue", async () => {
    renderModalWithDetail(makeDetail({
      labels: ["copy"],
      subtasks: [
        { key: "EBBACKLOG-124", summary: "A subtask", status: "To do", statusCategory: "new", assignee: "Unassigned", avatarUrl: null, prState: null, latestActivity: null, labels: [] },
      ],
    }));
    await screen.findByText("A story with a table");

    expect(screen.getByText("A subtask")).toBeInTheDocument();
    expect(screen.queryByText("Translation keys")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).not.toHaveClass("border-blue-500");
  });

  it("keeps the conflict notice above the refreshed content until the modal re-opens", async () => {
    vi.spyOn(api.missions, "initializeTranslationKeys").mockRejectedValue(
      new ApiError("Conflict", 409, {
        outcome: "already-initialized",
        copy: { status: null, translationKeys: tableDescription as AdfDocument, translationKeysState: "initialized" },
      }),
    );
    renderModalWithDetail(makeDetail({ labels: ["copy"] }));
    await openCopyTab("A story with a table");

    fireEvent.click(screen.getByRole("button", { name: "Create translation table" }));
    const notice = await screen.findByText("Translation keys changed in Jira");

    // The notice sits above the refreshed content — no toast, no tab switch, no modal close
    expect(notice.compareDocumentPosition(screen.getByText("checkout.title")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("A story with a table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toHaveClass("border-blue-500");
  });
});
