import { describe, expect, it } from "vitest";
import { getTranslationKeyValues } from "./services/translations.js";

describe("getTranslationKeyValues", () => {
  it("matches keys exactly and returns base values by locale", async () => {
    const result = await getTranslationKeyValues(
      ["checkout.title", "Checkout.title"],
      async () => ({
        metadataKeys: ["checkout.title"],
        locales: {
          "en-GB": { "checkout.title": "Continue" },
          "fr-FR": { "checkout.title": "Continuer" },
        },
      }),
    );

    expect(result).toEqual([
      {
        matchState: "matched",
        locales: [
          { locale: "en-GB", state: "found", value: "Continue" },
          { locale: "fr-FR", state: "found", value: "Continuer" },
        ],
      },
      {
        matchState: "unmatched",
        locales: [
          { locale: "en-GB", state: "missing" },
          { locale: "fr-FR", state: "missing" },
        ],
      },
    ]);
  });

  it("distinguishes missing locale values from empty strings", async () => {
    const result = await getTranslationKeyValues(
      ["checkout.title", "checkout.subtitle"],
      async () => ({
        metadataKeys: ["checkout.title", "checkout.subtitle"],
        locales: {
          "en-GB": { "checkout.title": "" },
          "fr-FR": { "checkout.title": null, "checkout.subtitle": null },
        },
      }),
    );

    expect(result).toEqual([
      {
        matchState: "matched",
        locales: [
          { locale: "en-GB", state: "found", value: "" },
          { locale: "fr-FR", state: "missing" },
        ],
      },
      {
        matchState: "matched",
        locales: [
          { locale: "en-GB", state: "missing" },
          { locale: "fr-FR", state: "missing" },
        ],
      },
    ]);
  });

  it("propagates translation repository read failures", async () => {
    await expect(
      getTranslationKeyValues(["checkout.title"], async () => {
        throw new Error("GitHub unavailable");
      }),
    ).rejects.toThrow("GitHub unavailable");
  });
});
