import { Router, type Request, type Response, type IRouter } from "express";
import * as launchpadService from "../services/launchpad.js";

export const launchpadRouter: IRouter = Router();

launchpadRouter.get("/escalated", async (_req: Request, res: Response) => {
  try {
    const tickets = await launchpadService.getLaunchpadEscalated();
    res.json({ tickets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Launchpad /escalated error:", message);
    res.status(500).json({ error: message });
  }
});

launchpadRouter.patch("/issues/:key/hide", async (req: Request<{ key: string }>, res: Response) => {
  try {
    const { key } = req.params;
    const { hideUntil } = req.body as { hideUntil?: string };
    if (!hideUntil) {
      res.status(400).json({ error: "Missing hideUntil date" });
      return;
    }
    await launchpadService.setHideUntilDate(key, hideUntil);
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Launchpad PATCH /issues/${req.params.key}/hide error:`, message);
    res.status(500).json({ error: message });
  }
});

launchpadRouter.get("/in-progress", async (_req: Request, res: Response) => {
  try {
    const items = await launchpadService.getLaunchpadInProgress();
    res.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Launchpad /in-progress error:", message);
    res.status(500).json({ error: message });
  }
});
