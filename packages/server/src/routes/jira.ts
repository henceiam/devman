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
