/**
 * Allowlist sanitizer for the admin-edited sources footnote.
 * The result is the only HTML passed to Ember's htmlSafe.
 * Tags: p, a, strong, em, br. Links: http(s) or a same-site path.
 */

const ALLOWED = new Set(["p", "a", "strong", "em", "br"]);
const DROP_BLOCKS = ["script", "style", "iframe", "object", "embed", "svg", "math", "template", "noscript"];

function decodeEntities(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#([0-9]+);?/g, (_, num) => {
      const code = Number(num);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&colon;/gi, ":")
    .replace(/&tab;/gi, "")
    .replace(/&newline;/gi, "")
    .replace(/&amp;/gi, "&");
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeHref(raw) {
  const trimmed = String(raw || "").trim();
  const decoded = decodeEntities(trimmed).replace(/[\u0000-\u0020]+/g, "");
  if (/^(javascript|data|vbscript):/i.test(decoded)) {
    return "";
  }
  if (/^https?:\/\//i.test(decoded)) {
    return trimmed;
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    return trimmed;
  }
  return "";
}

function hrefFromAttrs(attrs) {
  const match = String(attrs || "").match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
  if (!match) {
    return "";
  }
  return safeHref(match[1] ?? match[2] ?? match[3] ?? "");
}

function stripDangerousBlocks(html) {
  let next = html;
  for (const tag of DROP_BLOCKS) {
    const paired = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    const orphan = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
    for (let i = 0; i < 4; i++) {
      const stripped = next.replace(paired, "").replace(orphan, "");
      if (stripped === next) {
        break;
      }
      next = stripped;
    }
  }
  return next;
}

export function sanitizeSourcesHtml(input) {
  let html = String(input || "");
  if (!html.trim()) {
    return "";
  }
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = stripDangerousBlocks(html);
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, name, attrs) => {
    const tag = name.toLowerCase();
    if (!ALLOWED.has(tag)) {
      return "";
    }
    if (full.startsWith("</")) {
      return tag === "br" ? "" : `</${tag}>`;
    }
    if (tag === "br") {
      return "<br>";
    }
    if (tag === "a") {
      const href = hrefFromAttrs(attrs);
      if (!href) {
        return "";
      }
      return `<a href="${escapeAttr(href)}" rel="noopener noreferrer">`;
    }
    return `<${tag}>`;
  });
  return html.trim();
}
