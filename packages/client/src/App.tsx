import "./index.css";
import { BrowserRouter, Routes, Route, NavLink } from "react-router";
import JiraPanel from "./components/JiraPanel";
import GitHubPanel from "./components/GitHubPanel";
import MissionPage from "./components/MissionPage";
import LaunchpadPage from "./components/LaunchpadPage";

function Dashboard() {
  return (
    <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-2">
      <JiraPanel />
      <GitHubPanel />
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="DevMan" className="h-9 w-9" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">DevMan</h1>
                <p className="text-sm text-gray-500">Project tracker — Jira &amp; GitHub</p>
              </div>
            </div>
            <nav className="flex gap-4">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"}`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/missions"
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"}`
                }
              >
                Missions
              </NavLink>
              <NavLink
                to="/launchpad"
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"}`
                }
              >
                Launchpad
              </NavLink>
            </nav>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/missions/:missionKey?" element={<MissionPage />} />
          <Route path="/launchpad" element={<LaunchpadPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
