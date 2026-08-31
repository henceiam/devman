import { Router, type Request, type Response, type IRouter } from "express";
import * as missionService from "../services/missions.js";

export const missionsRouter: IRouter = Router();

missionsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const missions = await missionService.getMissions();
    res.json({ missions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Missions / error:", message);
    res.status(500).json({ error: message });
  }
});

missionsRouter.get("/:key/milestone-summaries", async (req: Request<{ key: string }>, res: Response) => {
  try {
    const summaries = await missionService.getMilestoneSummaries(req.params.key);
    res.json({ summaries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Missions GET /${req.params.key}/milestone-summaries error:`, message);
    res.status(500).json({ error: message });
  }
});

missionsRouter.put("/:key/milestone-summaries/:milestoneName", async (req: Request<{ key: string; milestoneName: string }>, res: Response) => {
  try {
    const { summary } = req.body as { summary: string };
    await missionService.setMilestoneSummary(req.params.key, req.params.milestoneName, summary);
    res.status(204).end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Missions PUT /${req.params.key}/milestone-summaries error:`, message);
    res.status(500).json({ error: message });
  }
});

missionsRouter.get("/:key", async (req: Request<{ key: string }>, res: Response) => {
  try {
    const { key } = req.params;
    if (!key) {
      res.status(400).json({ error: "Missing mission key" });
      return;
    }
    const detail = await missionService.getMissionDetail(key);
    res.json(detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Missions /${req.params.key} error:`, message);
    res.status(500).json({ error: message });
  }
});

missionsRouter.patch("/:key/columns", async (req: Request<{ key: string }>, res: Response) => {
  try {
    const { key } = req.params;
    const { columns } = req.body as { columns?: unknown };
    if (!key || !Array.isArray(columns)) {
      res.status(400).json({ error: "Missing key or columns array" });
      return;
    }
    await missionService.updateEpicColumns(key, columns as string[]);
    res.status(204).end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Missions PATCH /${req.params.key}/columns error:`, message);
    res.status(500).json({ error: message });
  }
});

missionsRouter.get("/stories/:storyKey/comments", async (req: Request<{ storyKey: string }>, res: Response) => {
  try {
    const { storyKey } = req.params;
    const comments = await missionService.getStoryComments(storyKey);
    res.json({ comments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Missions GET /stories/${req.params.storyKey}/comments error:`, message);
    res.status(500).json({ error: message });
  }
});

missionsRouter.get("/stories/:storyKey/github", async (req: Request<{ storyKey: string }>, res: Response) => {
  try {
    const { storyKey } = req.params;
    const data = await missionService.getStoryGithub(storyKey);
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Missions GET /stories/${req.params.storyKey}/github error:`, message);
    res.status(500).json({ error: message });
  }
});

missionsRouter.get("/stories/:storyKey/wayfinder", async (req: Request<{ storyKey: string }>, res: Response) => {
  try {
    const { storyKey } = req.params;
    const data = await missionService.getStoryWayfinder(storyKey);
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Missions GET /stories/${req.params.storyKey}/wayfinder error:`, message);
    res.status(500).json({ error: message });
  }
});

missionsRouter.get("/stories/:storyKey", async (req: Request<{ storyKey: string }>, res: Response) => {
  try {
    const { storyKey } = req.params;
    const detail = await missionService.getStoryDetail(storyKey);
    res.json(detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Missions GET /stories/${req.params.storyKey} error:`, message);
    res.status(500).json({ error: message });
  }
});

missionsRouter.patch("/stories/:storyKey", async (req: Request<{ storyKey: string }>, res: Response) => {
  try {
    const { storyKey } = req.params;
    const { milestone, category } = req.body as { milestone?: string | null; category?: string | null };
    await missionService.updateStory(storyKey, { milestone, category });
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Missions PATCH /stories/${req.params.storyKey} error:`, message);
    res.status(500).json({ error: message });
  }
});
