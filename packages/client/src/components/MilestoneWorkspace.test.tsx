import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MissionDetail } from "../api/client";
import { makeStory } from "../test/fixtures";
import MilestoneWorkspace from "./MilestoneWorkspace";

function detail(key: string): MissionDetail {
  return {
    epic: {
      key,
      summary: `${key} summary`,
      shortName: key,
      status: "In Progress",
      statusCategory: "indeterminate",
      columns: [{ name: "Feature", order: 0 }],
    },
    stories: [
      makeStory({ key: `${key}-1`, milestone: "Milestone 1" }),
      makeStory({ key: `${key}-2`, milestone: "Out of scope" }),
    ],
  };
}

const defaultProps = {
  hideDone: false,
  descriptions: {},
  onStorySelect: vi.fn(),
  onStoryUpdated: vi.fn(async () => detail("MISSION-A")),
  onEditDescription: vi.fn(),
};

describe("MilestoneWorkspace", () => {
  it("keeps independent List and Story Map collapse choices across view switches", () => {
    const { rerender } = render(
      <MilestoneWorkspace {...defaultProps} detail={detail("MISSION-A")} viewMode="list" />,
    );

    const listRow = screen.getByRole("button", { name: "Milestone 1" });
    expect(listRow).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(listRow);
    expect(listRow).toHaveAttribute("aria-expanded", "true");

    rerender(<MilestoneWorkspace {...defaultProps} detail={detail("MISSION-A")} viewMode="map" />);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Out of scope" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Milestone 1" }));

    rerender(<MilestoneWorkspace {...defaultProps} detail={detail("MISSION-A")} viewMode="list" />);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "true");

    rerender(<MilestoneWorkspace {...defaultProps} detail={detail("MISSION-A")} viewMode="map" />);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "false");
  });

  it("resets both collapse maps when the selected Mission changes", () => {
    const { rerender } = render(
      <MilestoneWorkspace {...defaultProps} detail={detail("MISSION-A")} viewMode="list" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Milestone 1" }));

    rerender(<MilestoneWorkspace {...defaultProps} detail={detail("MISSION-A")} viewMode="map" />);
    fireEvent.click(screen.getByRole("button", { name: "Milestone 1" }));

    rerender(<MilestoneWorkspace {...defaultProps} detail={detail("MISSION-B")} viewMode="list" />);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "false");

    rerender(<MilestoneWorkspace {...defaultProps} detail={detail("MISSION-B")} viewMode="map" />);
    expect(screen.getByRole("button", { name: "Milestone 1" })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps complete List progress when the Done card filter hides every story", () => {
    const doneDetail = detail("MISSION-A");
    doneDetail.stories = [makeStory({
      key: "MISSION-A-DONE",
      milestone: "Milestone 1",
      statusCategory: "done",
    })];

    render(
      <MilestoneWorkspace {...defaultProps} detail={doneDetail} viewMode="list" hideDone />,
    );

    expect(screen.getByText("1 story")).toBeInTheDocument();
    expect(screen.getByText("1 done")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Milestone 1" }));
    expect(screen.getByText("No stories yet")).toBeInTheDocument();
  });

  it("shows an expanded empty planning row without progress", () => {
    const emptyDetail = detail("MISSION-A");
    emptyDetail.stories = [];

    render(
      <MilestoneWorkspace {...defaultProps} detail={emptyDetail} viewMode="list" />,
    );

    expect(screen.queryByText(/stories?$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/done$/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Milestone 1" }));
    expect(screen.getByText("No stories yet")).toBeInTheDocument();
  });
});
