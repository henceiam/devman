const JIRA_HOST = import.meta.env.VITE_JIRA_HOST ?? "";

export function jiraUrl(key: string): string {
  return `${JIRA_HOST}/browse/${key}`;
}

interface JiraLinkProps {
  issueKey: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Renders an issue key (or custom children) as a link to Jira, opening in a new tab.
 * Stops click propagation so parent row/card click handlers are not triggered.
 */
export default function JiraLink({ issueKey, className, children }: JiraLinkProps) {
  return (
    <a
      href={jiraUrl(issueKey)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`font-mono text-xs text-blue-500 hover:text-blue-700 hover:underline ${className ?? ""}`}
    >
      {children ?? issueKey}
    </a>
  );
}
