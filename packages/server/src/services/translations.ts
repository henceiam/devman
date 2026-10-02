import { getBaseTranslationSnapshot } from "./github.js";

export interface BaseTranslationSnapshot {
  metadataKeys: string[];
  locales: Record<string, Record<string, string | null>>;
}

export type TranslationKeyValues = {
  matchState: "matched" | "unmatched";
  locales: Array<
    | { locale: string; state: "found"; value: string }
    | { locale: string; state: "missing" }
  >;
};

export async function getTranslationKeyValues(
  keys: string[],
  readSnapshot: () => Promise<BaseTranslationSnapshot> = getBaseTranslationSnapshot,
): Promise<TranslationKeyValues[]> {
  const snapshot = await readSnapshot();
  const metadataKeys = new Set(snapshot.metadataKeys);
  const locales = Object.entries(snapshot.locales).sort(([left], [right]) => left.localeCompare(right));

  return keys.map((key) => {
    const matched = metadataKeys.has(key);
    return {
      matchState: matched ? "matched" : "unmatched",
      locales: locales.map(([locale, values]) =>
        matched && Object.hasOwn(values, key) && values[key] !== null
          ? { locale, state: "found", value: values[key] }
          : { locale, state: "missing" },
      ),
    };
  });
}
