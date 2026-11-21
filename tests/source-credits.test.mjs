// SPDX-FileCopyrightText: 2026 Niclas Andersson and contributors
// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSourceCredits, termsWithCredits } from "../javascripts/discourse/lib/source-credits.js";

test("credits stay with the exact term and language; unknown IDs stay visible", () => {
  const registry = parseSourceCredits(JSON.stringify({
    catalogue: { label: "Example catalogue", url: "https://example.test/sources" },
    draft: { label: "Example draft", url: "file:///example" },
  }));
  const entry = {
    terms: { en: ["star", "moon", "constructor"], ar: ["نجمة"] },
    sources: { en: { star: ["catalogue", "catalogue", "other"], moon: ["draft"] } },
  };
  assert.deepEqual(termsWithCredits(entry, "en", registry), [
    { term: "star", credits: [{ label: "Example catalogue", url: "https://example.test/sources" }, { label: "other" }] },
    { term: "moon", credits: [{ label: "Example draft", url: undefined }] },
    { term: "constructor", credits: [] },
  ]);
  assert.deepEqual(termsWithCredits(entry, "ar", registry), [{ term: "نجمة", credits: [] }]);
  assert.deepEqual(termsWithCredits(entry, "en", null).map(({ credits }) => credits), [[], [], []]);
});
