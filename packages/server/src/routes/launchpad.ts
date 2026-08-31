import { Router, type Request, type Response, type IRouter } from "express";
import * as launchpadService from "../services/launchpad.js";

function createTeamRouter(team: string): IRouter {
  const router = Router();

  router.get("/escalated", async (_req: Request, res: Response) => {
    try {
      const tickets = await launchpadService.getLaunchpadEscalated(team);
      res.json({ tickets });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[${team}] /escalated error:`, message);
      res.status(500).json({ error: message });
    }
  });

  router.patch("/issues/:key/hide", async (req: Request<{ key: string }>, res: Response) => {
    try {
      const { key } = req.params;
      const { hideUntil } = req.body as { hideUntil?: string };
      if (hideUntil === undefined || hideUntil === null) {
        res.status(400).json({ error: "Missing hideUntil date" });
        return;
      }
      await launchpadService.setHideUntilDate(key, hideUntil);
      res.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[${team}] PATCH /issues/${req.params.key}/hide error:`, message);
      res.status(500).json({ error: message });
    }
  });

  router.get("/in-progress", async (_req: Request, res: Response) => {
    try {
      const items = await launchpadService.getLaunchpadInProgress(team);
      res.json({ items });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[${team}] /in-progress error:`, message);
      res.status(500).json({ error: message });
    }
  });

  return router;
}

export const launchpadRouter: IRouter = createTeamRouter("Radicals");
export const devilsRouter: IRouter = createTeamRouter("Devils");
