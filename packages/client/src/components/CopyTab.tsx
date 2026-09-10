import { useState } from "react";
import { api, ApiError, type InitializeTranslationKeysResponse, type IssueCopyData } from "../api/client";
import { copyStatusBadge } from "./statusUtils";
import { renderContent } from "./StoryDetailModal";

interface CopyTabProps {
  copy: IssueCopyData;
  issueKey: string;
  onCopyChange: (copy: IssueCopyData) => void;
}

export default function CopyTab({ copy, issueKey, onCopyChange }: CopyTabProps) {
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState(false);

  // The conflict notice belongs to the completed initialize action; it clears
  // when the underlying copy data changes again for any other reason.
  const [conflictCopy, setConflictCopy] = useState<IssueCopyData | null>(null);
  if (conflict && conflictCopy !== copy) setConflict(false);

  const handleInitialize = async () => {
    setSaving(true);
    setError(false);
    try {
      const response = await api.missions.initializeTranslationKeys(issueKey);
      onCopyChange(response.copy);
      if (response.outcome === "already-initialized") {
        setConflictCopy(response.copy);
        setConflict(true);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as InitializeTranslationKeysResponse | undefined;
        if (body?.copy) {
          onCopyChange(body.copy);
          setConflictCopy(body.copy);
          setConflict(true);
        } else {
          setError(true);
        }
      } else {
        setError(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const initialized = copy.translationKeysState === "initialized" && copy.translationKeys !== null;

  return (
    <div className="space-y-6">
      {conflict && (
        <div className="mb-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495a1.75 1.75 0 0 1 3.03 0l6.28 10.86A1.75 1.75 0 0 1 16.28 16H3.72a1.75 1.75 0 0 1-1.515-2.645l6.28-10.86ZM10 6.75a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
          <div>
            <p className="text-xs font-semibold">Translation keys changed in Jira</p>
            <p className="mt-0.5 text-xs leading-5">The latest Jira content is shown below. Nothing was overwritten.</p>
          </div>
        </div>
      )}
      <section>
        <h3 className="text-sm font-semibold text-gray-800">Copy &amp; Translations</h3>
        <p className="mt-1 text-xs text-gray-500">Current Jira workflow status</p>
        {copy.status !== null ? (
          <span className="mt-2 inline-block">{copyStatusBadge(copy.status)}</span>
        ) : (
          <p className="mt-2 text-xs text-gray-400">Not set</p>
        )}
      </section>
      <section>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Translation keys</h3>
          <p className="mt-1 text-xs text-gray-500">Read-only content from Jira</p>
        </div>
        {initialized ? (
          renderContent(copy.translationKeys)
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-gray-700">No translation keys yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-gray-500">
              Start with the standard Key, Copy, and Comment table. Existing Jira content will never be replaced by this action.
            </p>
            <button
              onClick={handleInitialize}
              disabled={saving}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-wait disabled:bg-blue-400"
            >
              {saving && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {saving ? "Creating table…" : "Create translation table"}
            </button>
            {error && (
              <p role="alert" className="mx-auto mt-3 max-w-md text-xs leading-5 text-red-600">
                Couldn’t create the table. Jira did not save the change. Try again.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
