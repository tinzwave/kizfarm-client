import DOMPurify from "isomorphic-dompurify";

// Course content is creator-written HTML, so it is always sanitized before
// rendering. DOMPurify drops <iframe> by default, which silently removed
// every YouTube video added with the lesson editor. Iframes are allowed
// back only when they point at a YouTube embed URL; anything else is
// removed.
const YOUTUBE_EMBED = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]{6,}([?#].*)?$/i;

let hookAdded = false;

export function sanitizeCourseHtml(html: string) {
  if (!hookAdded) {
    DOMPurify.addHook("uponSanitizeElement", (node, data) => {
      if (data.tagName !== "iframe") return;
      const src = (node as Element).getAttribute?.("src") || "";
      if (!YOUTUBE_EMBED.test(src)) node.parentNode?.removeChild(node);
    });
    hookAdded = true;
  }
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder"],
  });
}
