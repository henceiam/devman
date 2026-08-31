import { NavLink, Outlet } from "react-router";

export default function PullRequestsLayout() {
  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Pull Requests</h1>

      <nav className="mb-6 flex gap-4 border-b border-gray-200">
        <NavLink
          to=""
          end
          className={({ isActive }) =>
            `border-b-2 -mb-px px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`
          }
        >
          Open
        </NavLink>
        <NavLink
          to="recently-closed"
          className={({ isActive }) =>
            `border-b-2 -mb-px px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`
          }
        >
          Recently Closed
        </NavLink>
        <NavLink
          to="unreleased"
          className={({ isActive }) =>
            `border-b-2 -mb-px px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`
          }
        >
          Unreleased
        </NavLink>
      </nav>

      <Outlet />
    </main>
  );
}
