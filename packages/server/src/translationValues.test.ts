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
        environmentOverrides: {},
      }),
    );

    expect(result).toEqual([
      {
        matchState: "matched",
        locales: [
          { locale: "en-GB", state: "found", value: "Continue", overrides: [] },
          { locale: "fr-FR", state: "found", value: "Continuer", overrides: [] },
        ],
      },
      {
        matchState: "unmatched",
        locales: [
          { locale: "en-GB", state: "missing", overrides: [] },
          { locale: "fr-FR", state: "missing", overrides: [] },
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
        environmentOverrides: {},
      }),
    );

    expect(result).toEqual([
      {
        matchState: "matched",
        locales: [
          { locale: "en-GB", state: "found", value: "", overrides: [] },
          { locale: "fr-FR", state: "missing", overrides: [] },
        ],
      },
      {
        matchState: "matched",
        locales: [
          { locale: "en-GB", state: "missing", overrides: [] },
          { locale: "fr-FR", state: "missing", overrides: [] },
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

  it("returns environment overrides even when the base locale value is missing", async () => {
    const result = await getTranslationKeyValues(
      ["checkout.title", "checkout.subtitle"],
      async () => ({
        metadataKeys: ["checkout.title", "checkout.subtitle"],
        locales: {
          "en-GB": { "checkout.title": "Continue" },
          "fr-FR": { "checkout.title": null },
        },
        environmentOverrides: {
          prod: {
            "en-GB": { "checkout.title": "Continue to checkout" },
            "fr-FR": { "checkout.title": "Continuer" },
          },
          stage: {
            "en-GB": { "checkout.title": "" },
          },
        },
      }),
    );

    expect(result).toEqual([
      {
        matchState: "matched",
        locales: [
          {
            locale: "en-GB",
            state: "found",
            value: "Continue",
            overrides: [
              { environment: "prod", value: "Continue to checkout" },
              { environment: "stage", value: "" },
            ],
          },
          {
            locale: "fr-FR",
            state: "missing",
            overrides: [{ environment: "prod", value: "Continuer" }],
          },
        ],
      },
      {
        matchState: "matched",
        locales: [
          { locale: "en-GB", state: "missing", overrides: [] },
          { locale: "fr-FR", state: "missing", overrides: [] },
        ],
      },
    ]);
  });
});
