import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as missionService from "../services/missions.js";
import { missionsRouter } from "./missions.js";

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express();
  app.use("/api/missions", missionsRouter);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP server address");

  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/missions/issues/:issueKey/copy/translation-keys", () => {
  it("returns an explicit successful empty state", async () => {
    vi.spyOn(missionService, "getIssueTranslationKeys").mockResolvedValue({ state: "empty" });

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/missions/issues/EBBACKLOG-123/copy/translation-keys`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ state: "empty" });
    });
  });

  it("returns an error response when Jira fails instead of converting it to empty", async () => {
    vi.spyOn(missionService, "getIssueTranslationKeys").mockRejectedValue(new Error("Jira unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/missions/issues/EBBACKLOG-123/copy/translation-keys`);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Jira unavailable" });
    });
  });

  it("rejects issue keys outside Jira's key format", async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/api/missions/issues/${encodeURIComponent('BAD" OR project = "OTHER')}/copy/translation-keys`,
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid Jira issue key" });
    });
  });
});
