import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

type LocaleValue = {
  locale: string;
  base: string | null;
  overrides: { environment: string; unit: string; value: string }[];
};

type TranslationKey = {
  key: string;
  matched: boolean;
  references: { header: string; text: string }[];
  comment: string;
  locales: LocaleValue[];
};

type PrototypeIssue = {
  key: string;
  summary: string;
  status: string;
  epic: string;
  keys: TranslationKey[];
};

const locales = ["en-GB", "fr-FR", "de-DE", "es-ES", "ja-JP", "pt-BR"];

const issues: PrototypeIssue[] = [
  {
    key: "EBBACKLOG-742",
    summary: "Review localized checkout and consent copy",
    status: "Translation - in progress",
    epic: "Checkout",
    keys: [
      {
        key: "checkout.payment.continue",
        matched: true,
        references: [
          { header: "Button copy", text: "Continue to payment" },
          { header: "Clinical copy", text: "Continue to secure payment" },
          { header: "Dialog copy", text: "Continue" },
        ],
        comment: "Use the clinical wording only in the regulated checkout flow.",
        locales: [
          { locale: "en-GB", base: "Continue", overrides: [] },
          { locale: "fr-FR", base: "Continuer", overrides: [] },
          { locale: "de-DE", base: null, overrides: [] },
          { locale: "es-ES", base: "Continuar", overrides: [] },
          { locale: "ja-JP", base: "続ける", overrides: [] },
          {
            locale: "pt-BR",
            base: "Continuar",
            overrides: [
              { environment: "staging", unit: "checkout", value: "Avançar para pagamento" },
              { environment: "production", unit: "compact-checkout", value: "Avançar" },
            ],
          },
        ],
      },
      {
        key: "checkout.consent.title",
        matched: true,
        references: [
          { header: "Button copy", text: "Your choices" },
          { header: "Dialog copy", text: "Manage your privacy choices" },
        ],
        comment: "Keep the title short on small screens.",
        locales: [
          { locale: "en-GB", base: "Your choices", overrides: [] },
          { locale: "fr-FR", base: "Vos choix", overrides: [] },
          { locale: "de-DE", base: "Ihre Auswahl", overrides: [] },
          { locale: "es-ES", base: "Tus opciones", overrides: [] },
          { locale: "ja-JP", base: "選択内容", overrides: [] },
          { locale: "pt-BR", base: "Suas escolhas", overrides: [] },
        ],
      },
      {
        key: "checkout.payment.legacy_notice",
        matched: false,
        references: [
          { header: "Button copy", text: "Your payment is protected" },
          { header: "Clinical copy", text: "Payment details are handled securely" },
        ],
        comment: "Confirm whether this key was renamed in the translations source.",
        locales: locales.map((locale) => ({ locale, base: null, overrides: [] })),
      },
    ],
  },
  {
    key: "EBBACKLOG-741",
    summary: "Prepare copy for the new account flow",
    status: "Copy - ready to start",
    epic: "Account",
    keys: [],
  },
  {
    key: "EBBACKLOG-739",
    summary: "Update medication reminder wording",
    status: "Translation - ready to start",
    epic: "Reminders",
    keys: [
      {
        key: "reminder.schedule.heading",
        matched: true,
        references: [{ header: "Reminder title", text: "Choose when to be reminded" }],
        comment: "A source-repository error is simulated for this issue.",
        locales: locales.map((locale) => ({ locale, base: null, overrides: [] })),
      },
    ],
  },
];

const variants = [
  { id: "table", name: "Locale comparison table" },
  { id: "cards", name: "Per-key cards" },
  { id: "detail", name: "Key list + detail" },
] as const;

function LocaleValueView({
  value,
  expanded,
  onToggle,
}: {
  value: LocaleValue;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="min-w-32">
      <div className="font-medium text-gray-800">{value.base ?? <span className="italic text-amber-700">Missing value</span>}</div>
      {value.overrides.length > 0 && (
        <>
          <button
            type="button"
            onClick={onToggle}
            className="mt-1 text-xs font-medium text-blue-700 underline decoration-dotted underline-offset-2"
          >
            {value.overrides.length} override{value.overrides.length > 1 ? "s" : ""}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1 border-l-2 border-blue-200 pl-2 text-xs text-gray-600">
              {value.overrides.map((override) => (
                <li key={`${override.environment}-${override.unit}`}>
                  <span className="font-medium">{override.environment}</span> · {override.unit}: “{override.value}”
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function LocaleColumns({
  item,
  expandedOverrides,
  toggleOverride,
}: {
  item: TranslationKey;
  expandedOverrides: Set<string>;
  toggleOverride: (key: string, locale: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {item.locales.map((value) => {
        const id = `${item.key}|${value.locale}`;
        return (
          <div key={value.locale} className="rounded-md bg-gray-50 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{value.locale}</p>
            <LocaleValueView
              value={value}
              expanded={expandedOverrides.has(id)}
              onToggle={() => toggleOverride(item.key, value.locale)}
            />
          </div>
        );
      })}
    </div>
  );
}

function KeyIdentity({ item }: { item: TranslationKey }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="break-all text-sm font-semibold text-gray-900">{item.key}</code>
      {!item.matched && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          No exact match
        </span>
      )}
    </div>
  );
}

function ReferenceCopy({ item }: { item: TranslationKey }) {
  return (
    <div className="space-y-2">
      {item.references.map((reference) => (
        <div key={reference.header} className="rounded-md border border-gray-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold text-gray-500">{reference.header} · Jira</p>
          <p className="mt-1 text-sm text-gray-800">{reference.text}</p>
        </div>
      ))}
    </div>
  );
}

function PrototypeSwitcher({
  current,
  onChange,
}: {
  current: (typeof variants)[number]["id"];
  onChange: (id: (typeof variants)[number]["id"]) => void;
}) {
  const index = variants.findIndex((variant) => variant.id === current);
  const move = (offset: number) => onChange(variants[(index + offset + variants.length) % variants.length].id);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        move(event.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, onChange]);

  if (import.meta.env.PROD) return null;

  return (
    <nav aria-label="Prototype layout switcher" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full bg-gray-950 px-3 py-2 text-white shadow-xl">
      <button type="button" onClick={() => move(-1)} aria-label="Previous layout" className="rounded-full px-2 py-1 hover:bg-gray-700">←</button>
      <span className="min-w-52 text-center text-sm">
        {String.fromCharCode(65 + index)} · {variants[index].name}
      </span>
      <button type="button" onClick={() => move(1)} aria-label="Next layout" className="rounded-full px-2 py-1 hover:bg-gray-700">→</button>
    </nav>
  );
}

function ComparisonTable({
  items,
  expandedOverrides,
  toggleOverride,
}: {
  items: TranslationKey[];
  expandedOverrides: Set<string>;
  toggleOverride: (key: string, locale: string) => void;
}) {
  const referenceHeaders = [...new Set(items.flatMap((item) => item.references.map((reference) => reference.header)))];
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-[1500px] border-collapse text-left text-sm">
        <thead className="bg-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
          <tr>
            <th className="sticky left-0 bg-gray-100 px-4 py-3">Key</th>
            {referenceHeaders.map((header) => <th key={header} className="px-4 py-3">{header} · Jira</th>)}
            <th className="px-4 py-3">Jira comment</th>
            {locales.map((locale) => <th key={locale} className="px-4 py-3">{locale}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.key} className="align-top">
              <th className="sticky left-0 max-w-52 bg-white px-4 py-4 text-left"><KeyIdentity item={item} /></th>
              {referenceHeaders.map((header) => (
                <td key={header} className="max-w-56 px-4 py-4 text-gray-700">
                  {item.references.find((reference) => reference.header === header)?.text ?? "—"}
                </td>
              ))}
              <td className="max-w-56 px-4 py-4 text-gray-600">{item.comment}</td>
              {item.locales.map((value) => {
                const id = `${item.key}|${value.locale}`;
                return (
                  <td key={value.locale} className="min-w-36 px-4 py-4">
                    <LocaleValueView value={value} expanded={expandedOverrides.has(id)} onToggle={() => toggleOverride(item.key, value.locale)} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeyCards({
  items,
  expandedOverrides,
  toggleOverride,
}: {
  items: TranslationKey[];
  expandedOverrides: Set<string>;
  toggleOverride: (key: string, locale: string) => void;
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><KeyIdentity item={item} /><p className="mt-2 text-sm text-gray-600">{item.comment}</p></div>
            <span className="text-xs font-medium text-gray-500">Jira comment</span>
          </div>
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Reference copy · Jira</h4>
            <div className="grid gap-2 md:grid-cols-3"><ReferenceCopy item={item} /></div>
          </div>
          <div className="mt-5">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Locale base values · translations source</h4>
            <LocaleColumns item={item} expandedOverrides={expandedOverrides} toggleOverride={toggleOverride} />
          </div>
        </article>
      ))}
    </div>
  );
}

function KeyDetail({
  item,
  expandedOverrides,
  toggleOverride,
}: {
  item: TranslationKey;
  expandedOverrides: Set<string>;
  toggleOverride: (key: string, locale: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div><KeyIdentity item={item} /><p className="mt-2 text-sm text-gray-600">{item.comment}</p></div>
      <section><h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Reference copy · Jira</h4><ReferenceCopy item={item} /></section>
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Locale base values · translations source</h4>
        <LocaleColumns item={item} expandedOverrides={expandedOverrides} toggleOverride={toggleOverride} />
      </section>
    </div>
  );
}

export default function TranslationKeyLayoutPrototype() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedVariant = searchParams.get("variant");
  const activeVariant = variants.find((variant) => variant.id === requestedVariant)?.id ?? "table";
  const [issueKey, setIssueKey] = useState(issues[0].key);
  const [simulatedError, setSimulatedError] = useState(false);
  const [selectedKey, setSelectedKey] = useState(issues[0].keys[0].key);
  const [expandedOverrides, setExpandedOverrides] = useState<Set<string>>(new Set());
  const issue = issues.find((candidate) => candidate.key === issueKey) ?? issues[0];
  const selectedItem = issue.keys.find((item) => item.key === selectedKey) ?? issue.keys[0];

  const changeVariant = (id: (typeof variants)[number]["id"]) => {
    const next = new URLSearchParams(searchParams);
    next.set("variant", id);
    setSearchParams(next, { replace: true });
  };

  const toggleOverride = (key: string, locale: string) => {
    const id = `${key}|${locale}`;
    setExpandedOverrides((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectIssue = (key: string) => {
    const nextIssue = issues.find((candidate) => candidate.key === key) ?? issues[0];
    setIssueKey(key);
    setSelectedKey(nextIssue.keys[0]?.key ?? "");
    setSimulatedError(false);
    setExpandedOverrides(new Set());
  };

  return (
    <main className="mx-auto max-w-[1500px] p-6 pb-28">
      <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <span className="font-semibold">Prototype only.</span> This layout comparison uses mock data and does not read or change Jira or translations.
      </div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Issue #9 · layout study</p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-900">Translation-key details</h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Which layout makes it easiest to compare Jira reference copy with locale base values, while keeping missing values and contextual overrides clear?
        </p>
      </div>

      <section className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label htmlFor="prototype-issue" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Sample Jira issue</label>
          <select
            id="prototype-issue"
            value={issue.key}
            onChange={(event) => selectIssue(event.target.value)}
            className="mt-1 max-w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {issues.map((candidate) => <option key={candidate.key} value={candidate.key}>{candidate.key} · {candidate.summary}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setSimulatedError((value) => !value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {simulatedError ? "Clear source error" : "Simulate source error"}
        </button>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-xs text-gray-500">Issue summary</dt><dd className="font-medium text-gray-800">{issue.summary}</dd></div>
          <div><dt className="text-xs text-gray-500">Jira status</dt><dd className="font-medium text-gray-800">{issue.status}</dd></div>
          <div><dt className="text-xs text-gray-500">Epic</dt><dd className="font-medium text-gray-800">{issue.epic}</dd></div>
        </dl>
      </section>

      {simulatedError ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h3 className="font-semibold text-red-900">Couldn’t load translation values</h3>
          <p className="mt-1 text-sm text-red-800">The source repository is unavailable. This is an error, not an empty or unmatched result.</p>
          <button type="button" onClick={() => setSimulatedError(false)} className="mt-3 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800">Retry</button>
        </div>
      ) : issue.keys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <h3 className="font-semibold text-gray-800">No translation-key table in Jira</h3>
          <p className="mt-1 text-sm text-gray-500">This issue has no key rows to compare.</p>
        </div>
      ) : activeVariant === "table" ? (
        <ComparisonTable items={issue.keys} expandedOverrides={expandedOverrides} toggleOverride={toggleOverride} />
      ) : activeVariant === "cards" ? (
        <KeyCards items={issue.keys} expandedOverrides={expandedOverrides} toggleOverride={toggleOverride} />
      ) : (
        <div className="grid min-h-[560px] overflow-hidden rounded-xl border border-gray-200 bg-white md:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-gray-200 bg-gray-50 p-3 md:border-b-0 md:border-r">
            <h3 className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Keys ({issue.keys.length})</h3>
            <ul className="space-y-1">
              {issue.keys.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(item.key)}
                    className={`w-full rounded-md px-3 py-3 text-left text-sm ${selectedItem?.key === item.key ? "bg-blue-100 text-blue-950" : "text-gray-700 hover:bg-gray-100"}`}
                  >
                    <span className="block break-all font-mono text-xs font-semibold">{item.key}</span>
                    <span className="mt-1 block text-xs">{item.matched ? "Matched" : "No exact match"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <section className="p-5 md:p-7">
            {selectedItem && <KeyDetail item={selectedItem} expandedOverrides={expandedOverrides} toggleOverride={toggleOverride} />}
          </section>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">Locale presence is not translation progress. Jira workflow status above is issue-level context only.</p>
      <PrototypeSwitcher current={activeVariant} onChange={changeVariant} />
    </main>
  );
}
