import { getTranslationSnapshot } from "./github.js";

export interface TranslationSnapshot {
  metadataKeys: string[];
  locales: Record<string, Record<string, string | null>>;
  environmentOverrides: Record<string, Record<string, Record<string, string | null>>>;
}

export interface TranslationOverride {
  environment: string;
  value: string;
}

export type TranslationLocaleValue =
  | { locale: string; state: "found"; value: string; overrides: TranslationOverride[] }
  | { locale: string; state: "missing"; overrides: TranslationOverride[] };

export type TranslationKeyValues = {
  matchState: "matched" | "unmatched";
  locales: TranslationLocaleValue[];
};

export async function getTranslationKeyValues(
  keys: string[],
  readSnapshot: () => Promise<TranslationSnapshot> = getTranslationSnapshot,
): Promise<TranslationKeyValues[]> {
  const snapshot = await readSnapshot();
  const metadataKeys = new Set(snapshot.metadataKeys);
  const locales = Object.entries(snapshot.locales).sort(([left], [right]) => left.localeCompare(right));
  const environments = Object.entries(snapshot.environmentOverrides)
    .sort(([left], [right]) => left.localeCompare(right));

  return keys.map((key) => {
    const matched = metadataKeys.has(key);
    return {
      matchState: matched ? "matched" : "unmatched",
      locales: locales.map(([locale, values]) => {
        const overrides = environments.flatMap(([environment, localeValues]) => {
          const environmentValues = localeValues[locale];
          if (!environmentValues || !Object.hasOwn(environmentValues, key)) return [];
          const overrideValue = environmentValues[key];
          return typeof overrideValue === "string"
            ? [{ environment, value: overrideValue }]
            : [];
        });
        const value = values[key];
        return matched && Object.hasOwn(values, key) && typeof value === "string"
          ? { locale, state: "found", value, overrides }
          : { locale, state: "missing", overrides };
      }),
    };
  });
}
