import { useState } from "react";

interface EditCategoriesModalProps {
  epicKey: string;
  initialColumns: string[];
  onSave: (columns: string[]) => Promise<void>;
  onClose: () => void;
}

export default function EditCategoriesModal({ initialColumns, onSave, onClose }: EditCategoriesModalProps) {
  const [value, setValue] = useState(initialColumns.join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const columns = value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const invalid = columns.filter((c) => c.includes(";"));
    if (invalid.length > 0) {
      setError(`Category names cannot contain semicolons: ${invalid.join(", ")}`);
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave(columns);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Edit Categories</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-500">One category per line. Order determines column order.</p>
          <textarea
            className="w-full resize-y rounded border border-gray-300 p-2 font-mono text-sm focus:border-blue-400 focus:outline-none"
            rows={8}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
