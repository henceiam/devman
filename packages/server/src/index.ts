import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { jiraRouter } from "./routes/jira.js";
import { githubRouter } from "./routes/github.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/jira", jiraRouter);
app.use("/api/github", githubRouter);

app.listen(config.server.port, () => {
  console.log(`DevMan server listening on http://localhost:${config.server.port}`);
});
