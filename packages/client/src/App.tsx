import "./index.css";
import JiraPanel from "./components/JiraPanel";
import GitHubPanel from "./components/GitHubPanel";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">DevMan</h1>
        <p className="text-sm text-gray-500">Project tracker — Jira &amp; GitHub</p>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-2">
        <JiraPanel />
        <GitHubPanel />
      </main>
    </div>
  );
}
