// PROTOTYPE (issue #9) - throwaway, mock data only. Layout C (key list + detail),
// shown inline when an issue row is expanded in the overview list.
import { useState } from "react";
import JiraLink from "./JiraLink";

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
  copyStatus: string;
  epic: string;
  loadError?: boolean;
  keys: TranslationKey[];
};

const locales = ["en-GB", "sv-SE", "fr-FR", "de-DE", "es-ES", "ja-JP"];
const noValues = (): LocaleValue[] => locales.map((locale) => ({ locale, base: null, overrides: [] }));

const longEn =
  "Before you continue, please review how we collect and use your health information.\n\nWe only use the information you share to provide your treatment plan, to remind you about upcoming appointments, and to help your care team follow your progress. We never sell your data, and you can withdraw your consent at any time from your account settings.\n\nIf you have questions about how your information is handled, contact our privacy team.";
const longSv =
  "Innan du fortsätter ber vi dig läsa hur vi samlar in och använder din hälsoinformation.\n\nVi använder bara den information du delar för att ge dig din behandlingsplan, påminna dig om kommande besök och hjälpa ditt vårdteam att följa dina framsteg. Vi säljer aldrig dina uppgifter, och du kan när som helst återkalla ditt samtycke i kontoinställningarna.\n\nOm du har frågor om hur din information hanteras kan du kontakta vårt integritetsteam.";

const issues: PrototypeIssue[] = [
  {
    key: "EBBACKLOG-742",
    summary: "Review localized checkout and consent copy",
    status: "In Progress",
    copyStatus: "Translation - in progress",
    epic: "Checkout",
    keys: [
      {
        key: "checkout.payment.continue",
        matched: true,
        references: [
          { header: "sv-SE", text: "Fortsätt till betalning" },
          { header: "en-GB", text: "Continue to payment" },
        ],
        comment: "Keep this short, it is used on a small button.",
        locales: [
          { locale: "en-GB", base: "Continue", overrides: [] },
          { locale: "sv-SE", base: "Fortsätt", overrides: [] },
          { locale: "fr-FR", base: "Continuer", overrides: [] },
          { locale: "de-DE", base: null, overrides: [] },
          { locale: "es-ES", base: "Continuar", overrides: [] },
          {
            locale: "ja-JP",
            base: "続ける",
            overrides: [
              { environment: "staging", unit: "checkout", value: "お支払いへ進む" },
              { environment: "production", unit: "compact-checkout", value: "進む" },
            ],
          },
        ],
      },
      {
        key: "checkout.consent.body",
        matched: true,
        references: [
          { header: "sv-SE", text: longSv },
          { header: "en-GB", text: longEn },
        ],
        comment:
          "Legal reviewed this text. Do not shorten it, and keep the paragraph breaks. The second paragraph must stay exactly as written in every locale.",
        locales: [
          { locale: "en-GB", base: longEn, overrides: [] },
          { locale: "sv-SE", base: longSv, overrides: [] },
          {
            locale: "fr-FR",
            base: "Avant de continuer, veuillez examiner la manière dont nous collectons et utilisons vos informations de santé.\n\nNous n’utilisons que les informations que vous partagez pour établir votre plan de traitement, vous rappeler vos prochains rendez-vous et aider votre équipe soignante à suivre vos progrès. Nous ne vendons jamais vos données, et vous pouvez retirer votre consentement à tout moment depuis les paramètres de votre compte.",
            overrides: [
              {
                environment: "production",
                unit: "clinic-portal",
                value:
                  "Avant de continuer, veuillez lire comment la clinique collecte et utilise vos informations de santé.\n\nLes informations que vous partagez servent uniquement à votre prise en charge. Vous pouvez retirer votre consentement à tout moment en contactant votre clinique.",
              },
            ],
          },
          { locale: "de-DE", base: null, overrides: [] },
          { locale: "es-ES", base: "", overrides: [] },
          { locale: "ja-JP", base: "続行する前に、当社が健康情報をどのように収集し、利用するかをご確認ください。", overrides: [] },
        ],
      },
      {
        key: "checkout.payment.legacy_notice",
        matched: false,
        references: [
          { header: "sv-SE", text: "Din betalning är skyddad" },
          { header: "en-GB", text: "Your payment is protected" },
          { header: "Jira column 3 title", text: "Payment details are handled securely" },
        ],
        comment: "Check whether this key was renamed in the translations source.",
        locales: noValues(),
      },
    ],
  },
  {
    key: "EBBACKLOG-741",
    summary: "Prepare copy for the new account flow",
    status: "To do",
    copyStatus: "Copy - ready to start",
    epic: "Account",
    keys: [],
  },
  {
    key: "EBBACKLOG-739",
    summary: "Update medication reminder wording",
    status: "Ready for test",
    copyStatus: "Translation - ready to start",
    epic: "Reminders",
    loadError: true,
    keys: [],
  },
];

function LocaleValueView({
  value,
  expanded,
  onToggle,
}: {
  value: LocaleValue;
  expanded: boolean;
  onToggle: () => void;
}) {
  const missing = value.base === null || value.base === "";
  return (
    <div>
      {missing ? (
        <div className="italic text-amber-700">Missing value</div>
      ) : (
        <div className="whitespace-pre-line text-sm leading-6 text-gray-800">{value.base}</div>
      )}
      {value.overrides.length > 0 && (
        <>
          <button
            type="button"
            onClick={onToggle}
            className="mt-2 text-xs font-medium text-blue-700 underline decoration-dotted underline-offset-2"
          >
            {value.overrides.length} override{value.overrides.length > 1 ? "s" : ""} {expanded ? "▾" : "▸"}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-3 border-l-2 border-blue-200 pl-3 text-xs text-gray-600">
              {value.overrides.map((override) => (
                <li key={`${override.environment}-${override.unit}`}>
                  <span className="font-semibold">
                    {override.environment} · {override.unit}
                  </span>
                  <div className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-800">{override.value}</div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
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
  toggleOverride: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="break-all text-sm font-semibold text-gray-900">{item.key}</code>
          {!item.matched && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              No exact match in translations source
            </span>
          )}
        </div>
        <p className="mt-2 max-w-3xl whitespace-pre-line text-sm text-gray-600">
          <span className="font-medium text-gray-700">Jira comment: </span>
          {item.comment}
        </p>
      </div>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Reference copy</h4>
        <div className="grid gap-3 lg:grid-cols-2">
          {item.references.map((reference) => (
            <div key={reference.header} className="rounded-md border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold text-gray-500">{reference.header}</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-800">{reference.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Locale base values</h4>
        <div className="grid gap-3 lg:grid-cols-2">
          {item.locales.map((value) => {
            const id = `${item.key}|${value.locale}`;
            return (
              <div key={value.locale} className="rounded-md bg-gray-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{value.locale}</p>
                <LocaleValueView value={value} expanded={expandedOverrides.has(id)} onToggle={() => toggleOverride(id)} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function IssueDetail({ issue }: { issue: PrototypeIssue }) {
  const [selectedKey, setSelectedKey] = useState(issue.keys[0]?.key ?? "");
  const [expandedOverrides, setExpandedOverrides] = useState<Set<string>>(new Set());
  const [retried, setRetried] = useState(false);
  const selectedItem = issue.keys.find((item) => item.key === selectedKey) ?? issue.keys[0];

  const toggleOverride = (id: string) =>
    setExpandedOverrides((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (issue.loadError && !retried) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5">
        <h3 className="font-semibold text-red-900">Couldn’t load translation values</h3>
        <p className="mt-1 text-sm text-red-800">
          The translations repository is unavailable. This is an error, not an empty or unmatched result.
        </p>
        <button
          type="button"
          onClick={() => setRetried(true)}
          className="mt-3 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (issue.keys.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
        <h3 className="font-semibold text-gray-800">{retried ? "Retry succeeded, but there are no keys" : "No translation keys in Jira"}</h3>
        <p className="mt-1 text-sm text-gray-500">This issue has no translation-key table rows to compare.</p>
      </div>
    );
  }

  return (
    <div className="grid overflow-hidden rounded-xl border border-gray-200 bg-white md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-gray-200 bg-gray-50 p-3 md:border-b-0 md:border-r">
        <h3 className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Keys ({issue.keys.length})
        </h3>
        <ul className="space-y-1">
          {issue.keys.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => setSelectedKey(item.key)}
                className={`w-full rounded-md px-3 py-3 text-left text-sm ${selectedItem?.key === item.key ? "bg-blue-100 text-blue-950" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <span className="block break-all font-mono text-xs font-semibold">{item.key}</span>
                {!item.matched && <span className="mt-1 block text-xs text-amber-700">No exact match</span>}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="p-5 md:p-7">
        {selectedItem && (
          <KeyDetail item={selectedItem} expandedOverrides={expandedOverrides} toggleOverride={toggleOverride} />
        )}
      </section>
    </div>
  );
}

export default function TranslationKeyLayoutPrototype() {
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set([issues[0].key]));

  const toggleIssue = (key: string) =>
    setOpenKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <span className="font-semibold">Prototype only (issue #9).</span> Mock data; nothing is read from or written to Jira or translations.
      </div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Copy &amp; Translations</h2>
        <p className="mt-1 text-sm text-gray-500">
          Jira issues labelled for copy or clinical copy, across the Radicals team. Click an issue to inspect its translation keys.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="w-8 px-4 py-3" />
              <th scope="col" className="px-4 py-3">Issue</th>
              <th scope="col" className="px-4 py-3">Summary</th>
              <th scope="col" className="px-4 py-3">Jira status</th>
              <th scope="col" className="px-4 py-3">Copy &amp; Translations</th>
              <th scope="col" className="px-4 py-3">Epic</th>
            </tr>
          </thead>
          {issues.map((issue) => {
            const open = openKeys.has(issue.key);
            return (
              <tbody key={issue.key} className="border-t border-gray-100">
                <tr
                  onClick={() => toggleIssue(issue.key)}
                  aria-expanded={open}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-gray-400">{open ? "▾" : "▸"}</td>
                  <td className="whitespace-nowrap px-4 py-3"><JiraLink issueKey={issue.key} /></td>
                  <td className="min-w-64 px-4 py-3 text-gray-800">{issue.summary}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{issue.status}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{issue.copyStatus}</td>
                  <td className="px-4 py-3 text-gray-700">{issue.epic}</td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={6} className="bg-gray-50 px-4 py-4">
                      <IssueDetail issue={issue} />
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Locale presence is not translation progress. The Copy &amp; Translations column is the issue-level Jira stage only.
      </p>
    </main>
  );
}
