/**
 * Local static server plus a Discourse-like /t/{id}.json and /raw/{id}/{n}
 * that serve exported forum posts from outside the theme repo.
 *
 *   node harness/serve.mjs
 *   # then open http://127.0.0.1:<port>/harness/index.html
 *   # or http://127.0.0.1:<port>/harness/index.html?topic=99999
 */
import { createMockForumServer } from "./mock-forum.mjs";

const { port, base } = await createMockForumServer({ listen: true });
console.log("harness", `${base}/harness/index.html`);
console.log("forum data via", `${base}/harness/index.html?topic=99999`);
