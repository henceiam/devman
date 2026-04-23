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
