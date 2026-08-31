import { Router, type Request, type Response, type IRouter } from "express";
import * as githubService from "../services/github.js";

export const githubRouter: IRouter = Router();

githubRouter.get("/repos", async (_req: Request, res: Response) => {
  try {
    const repos = await githubService.getRepos();
    res.json({ repos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("GitHub /repos error:", message);
    res.status(500).json({ error: message });
  }
});

githubRouter.get("/pulls", async (req: Request, res: Response) => {
  try {
    const owner = req.query.owner as string;
    const repo = req.query.repo as string;
    if (!owner || !repo) {
      res.status(400).json({ error: "Missing required query parameters: owner, repo" });
      return;
    }
    const state = (req.query.state as "open" | "closed" | "all") || "open";
    const pulls = await githubService.getPullRequests(owner, repo, state);
    res.json({ pulls });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("GitHub /pulls error:", message);
    res.status(500).json({ error: message });
  }
});

githubRouter.get("/pull-requests", async (req: Request, res: Response) => {
  try {
    const repoFilter = req.query.repo as string | undefined;
    const authorFilter = req.query.author as string | undefined;
    const state = (req.query.state as "open" | "closed" | "all") || "open";
    const sinceDays = req.query.sinceDays ? parseInt(req.query.sinceDays as string, 10) : undefined;
    const pulls = await githubService.getPullRequestsWithReviews({
      repoFilter,
      authorFilter,
      state,
      sinceDays,
    });
    res.json({ pulls });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("GitHub /pull-requests error:", message);
    res.status(500).json({ error: message });
  }
});
