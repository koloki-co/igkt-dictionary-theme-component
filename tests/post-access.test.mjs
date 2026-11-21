// SPDX-FileCopyrightText: 2026 Koloki Ltd
// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const load = async (file) => import(`data:text/javascript;base64,${Buffer.from(await readFile(new URL(file, root), "utf8")).toString("base64")}`);
const data = await load("javascripts/discourse/lib/dictionary-data.js");
const { SAMPLE_ENTRIES } = await load("javascripts/discourse/lib/sample-data.js");

function partPost(part, entry) {
  return (
    "```igkt-dictionary\n" +
    JSON.stringify({ v: 1, part, parts: 2 }) +
    "\n" +
    JSON.stringify(entry) +
    "\n```"
  );
}

test("a post the visitor cannot read is skipped; a hidden topic is still an error", async () => {
  const posts = {
    1: partPost(1, SAMPLE_ENTRIES[0]),
    2: partPost(2, SAMPLE_ENTRIES[1]),
  };
  // The visible posts stop at 2, but the topic's highest number is a later
  // staff whisper (403) and a deleted number (404). Both must be skipped.
  const topic = {
    posts_count: 2,
    highest_post_number: 4,
    post_stream: { posts: [{ post_number: 1 }, { post_number: 2 }] },
  };
  assert.deepEqual(data.postNumbersToFetch(topic), [1, 2, 3, 4]);

  const loaded = await data.loadFromTopic("55", {
    fetchJson: async () => topic,
    fetchText: async (path) => {
      const number = Number(path.split("/").pop());
      if (number === 3) {
        throw Object.assign(new Error("HTTP 403"), { status: 403 });
      }
      if (!posts[number]) {
        throw Object.assign(new Error("HTTP 404"), { status: 404 });
      }
      return posts[number];
    },
  });
  assert.deepEqual(loaded.map((entry) => entry.id), ["example-0001", "example-0002"]);

  await assert.rejects(
    data.loadFromTopic("55", {
      fetchJson: async () => {
        throw Object.assign(new Error("HTTP 403"), { status: 403 });
      },
      fetchText: async () => {
        throw new Error("topic JSON failed first");
      },
    }),
    (error) => error.code === "unavailable" && /HTTP 403/.test(error.message)
  );

  await assert.rejects(
    data.loadFromTopic("55", {
      fetchJson: async () => ({
        posts_count: 1,
        highest_post_number: 1,
        post_stream: { posts: [{ post_number: 1 }] },
      }),
      fetchText: async () => {
        throw Object.assign(new Error("HTTP 500"), { status: 500 });
      },
    }),
    (error) => error.code === "unavailable" && /HTTP 500/.test(error.message)
  );
});

test("a required part the visitor cannot read is reported as missing", async () => {
  await assert.rejects(
    data.loadFromTopic("55", {
      fetchJson: async () => ({
        posts_count: 1,
        highest_post_number: 2,
        post_stream: { posts: [{ post_number: 1 }] },
      }),
      fetchText: async (path) => {
        const number = Number(path.split("/").pop());
        if (number === 1) {
          return partPost(1, SAMPLE_ENTRIES[0]);
        }
        throw Object.assign(new Error("HTTP 403"), { status: 403 });
      },
    }),
    (error) => error.code === "incomplete" && /missing part/.test(error.message)
  );
});
