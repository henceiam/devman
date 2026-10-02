import { Router, type Request, type Response, type IRouter } from "express";
import * as jiraService from "../services/jira.js";

export const jiraRouter: IRouter = Router();

jiraRouter.get("/diagnostics", async (_req: Request, res: Response) => {
  try {
    const steps = await jiraService.runDiagnostics();
    res.json({ steps });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Jira /diagnostics error:", message);
    res.status(500).json({ error: message });
  }
});

jiraRouter.get("/projects", async (_req: Request, res: Response) => {
  try {
    const projects = await jiraService.getProjects();
    res.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Jira /projects error:", message);
    res.status(500).json({ error: message });
  }
});

// Read-only generic JQL search, intended for local agents/tools.
// Only exposes issue search — no write/transition operations.
jiraRouter.post("/search", async (req: Request, res: Response) => {
  try {
    const { jql, maxResults, fields } = req.body as {
      jql?: string;
      maxResults?: number;
      fields?: string[];
    };
    if (!jql || typeof jql !== "string") {
      res.status(400).json({ error: "Missing required field: jql" });
      return;
    }
    const result = await jiraService.searchIssues(
      jql,
      typeof maxResults === "number" && maxResults > 0 ? maxResults : 50,
      Array.isArray(fields) && fields.length > 0 ? fields : undefined,
    );
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Jira /search error:", message);
    res.status(500).json({ error: message });
  }
});

jiraRouter.get("/issues", async (req: Request, res: Response) => {
  try {
    const project = req.query.project as string;
    if (!project) {
      res.status(400).json({ error: "Missing required query parameter: project" });
      return;
    }
    const maxResults = parseInt(req.query.maxResults as string, 10) || 50;
    const result = await jiraService.getIssues(project, maxResults);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Jira /issues error:", message);
    res.status(500).json({ error: message });
  }
});

jiraRouter.get("/copy-progress", async (_req: Request, res: Response) => {
  try {
    const issues = await jiraService.getCopyProgress();
    res.json({ issues });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Jira /copy-progress error:", message);
    res.status(500).json({ error: message });
  }
});
