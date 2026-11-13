import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve, dirname, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath } from "node:url";

const themeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
};

export async function listPostFiles(forumDir) {
  const names = (await readdir(forumDir))
    .filter((n) => /^post-\d+\.md$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  return names.map((name) => join(forumDir, name));
}

export async function createMockForumServer({
  forumDir = process.env.IGKT_FORUM_DATA || null,
  topicId = process.env.IGKT_TOPIC_ID || "99999",
  listen = false,
  port = 0,
} = {}) {
  const posts = forumDir && existsSync(forumDir) ? await listPostFiles(forumDir) : [];
  const postBodies = [];
  for (const file of posts) {
    postBodies.push(await readFile(file, "utf8"));
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    let path = decodeURIComponent(url.pathname);

    const topicJson = path.match(/^\/t\/(\d+)\.json$/);
    const rawPost = path.match(/^\/raw\/(\d+)\/(\d+)$/);
    const forumFile = path.match(/^\/forum-data\/(.+)$/);

    const send = (status, type, body) => {
      res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
      res.end(body);
    };

    if (topicJson) {
      const id = topicJson[1];
      if (id !== String(topicId)) {
        return send(404, "application/json; charset=utf-8", JSON.stringify({ error: "not found" }));
      }
      if (!postBodies.length) {
        return send(404, "application/json; charset=utf-8", JSON.stringify({ error: "no data" }));
      }
      const payload = {
        id: Number(id),
        posts_count: postBodies.length,
        post_stream: {
          posts: postBodies.map((_, i) => ({
            id: 1000 + i,
            post_number: i + 1,
          })),
        },
      };
      return send(200, "application/json; charset=utf-8", JSON.stringify(payload));
    }

    if (rawPost) {
      const id = rawPost[1];
      const n = Number(rawPost[2]);
      if (id !== String(topicId) || n < 1 || n > postBodies.length) {
        return send(404, "text/plain; charset=utf-8", "not found");
      }
      return send(200, "text/plain; charset=utf-8", postBodies[n - 1]);
    }

    if (forumFile) {
      if (!forumDir) {
        return send(404, "text/plain; charset=utf-8", "no data configured");
      }
      const file = resolve(forumDir, forumFile[1]);
      if (!file.startsWith(resolve(forumDir) + "/") && file !== resolve(forumDir)) {
        return send(403, "text/plain; charset=utf-8", "forbidden");
      }
      if (!existsSync(file)) {
        return send(404, "text/plain; charset=utf-8", "not found");
      }
      const body = await readFile(file);
      return send(200, types[extname(file)] || "application/octet-stream", body);
    }

    if (path.endsWith("/")) path += "index.html";
    const file = resolve(themeRoot, "." + path);
    const localPath = relative(themeRoot, file);
    if (isAbsolute(localPath) || localPath.split(sep).some((part) => part.startsWith(".")) || !existsSync(file)) {
      return send(404, "text/plain; charset=utf-8", "not found");
    }
    try {
      const body = await readFile(file);
      return send(200, types[extname(file)] || "application/octet-stream", body);
    } catch (e) {
      return send(500, "text/plain; charset=utf-8", String(e));
    }
  });

  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  const addr = server.address();
  const base = `http://127.0.0.1:${addr.port}`;
  return {
    server,
    port: addr.port,
    base,
    topicId: String(topicId),
    posts: postBodies.length,
    forumDir,
    close: () => new Promise((r) => server.close(r)),
  };
}
