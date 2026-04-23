import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
  server: {
    port: parseInt(process.env.SERVER_PORT || "3001", 10),
  },
  jira: {
    host: process.env.JIRA_HOST || "",
    email: process.env.JIRA_EMAIL || "",
    apiToken: process.env.JIRA_API_TOKEN || "",
  },
  github: {
    token: process.env.GITHUB_TOKEN || "",
  },
};
