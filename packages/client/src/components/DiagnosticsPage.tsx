import { useState } from "react";
import { api, type DiagnosticStep } from "../api/client";

const STATUS_STYLE: Record<DiagnosticStep["status"], { icon: string; className: string }> = {
  pass: { icon: "✓", className: "text-green-700 bg-green-50 border-green-200" },
  fail: { icon: "✗", className: "text-red-700 bg-red-50 border-red-200" },
  skip: { icon: "–", className: "text-gray-500 bg-gray-50 border-gray-200" },
};

export default function DiagnosticsPage() {
  const [steps, setSteps] = useState<DiagnosticStep[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runDiagnostics() {
    setLoading(true);
    setSteps(null);
    setError(null);
    try {
      const result = await api.jira.runDiagnostics();
      setSteps(result.steps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const allPass = steps?.every((s) => s.status !== "fail");

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Jira Connection Diagnostics</h2>
      <p className="mb-6 text-sm text-gray-500">
        Runs sequential checks against the Jira API to identify where the connection breaks down.
      </p>

      <button
        onClick={runDiagnostics}
        disabled={loading}
        className="mb-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Running…" : "Run Diagnostics"}
      </button>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {steps && (
        <>
          <div className="mb-4 space-y-3">
            {steps.map((step) => {
              const style = STATUS_STYLE[step.status];
              return (
                <div
                  key={step.name}
                  className={`rounded border px-4 py-3 ${style.className}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{style.icon}</span>
                    <span className="font-semibold">{step.name}</span>
                  </div>
                  <p className="mt-1 text-sm opacity-80">{step.detail}</p>
                </div>
              );
            })}
          </div>

          <p className={`text-sm font-medium ${allPass ? "text-green-700" : "text-red-700"}`}>
            {allPass ? "All checks passed." : "One or more checks failed — see details above."}
          </p>
        </>
      )}
    </main>
  );
}
