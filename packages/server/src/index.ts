import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { jiraRouter } from "./routes/jira.js";
import { githubRouter } from "./routes/github.js";
import { missionsRouter } from "./routes/missions.js";
import { launchpadRouter, devilsRouter } from "./routes/launchpad.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/jira", jiraRouter);
app.use("/api/github", githubRouter);
app.use("/api/missions", missionsRouter);
app.use("/api/launchpad", launchpadRouter);
app.use("/api/devils", devilsRouter);

app.listen(config.server.port, () => {
  console.log(`DevMan server listening on http://localhost:${config.server.port}`);
});
