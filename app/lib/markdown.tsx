import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { videoEmbedUrl } from "./video-embed";
import { VideoEmbedPlayer } from "../components/video-embed-player";

function safeLink(value: string) {
  try {
    const parsed = new URL(value, "https://kudihub.invalid");
    if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) return "";
    return value.startsWith("/") ? value : parsed.toString();
  } catch {
    return "";
  }
}

function safeImageSrc(value: string) {
  if (value.startsWith("/")) return /^[/?a-zA-Z0-9._-]*$/.test(value) ? value : "";
  const parsed = safeLink(value);
  return parsed.startsWith("https://") || parsed.startsWith("http://") ? parsed : "";
}

const components: Components = {
  a: ({ href, children }) => {
    const safe = typeof href === "string" ? safeLink(href) : "";
    if (!safe) return <>{children}</>;
    return <a href={safe} target={safe.startsWith("http") ? "_blank" : undefined} rel={safe.startsWith("http") ? "noreferrer" : undefined}>{children}</a>;
  },
  img: ({ src, alt }) => {
    const safe = typeof src === "string" ? safeImageSrc(src) : "";
    return safe ? <img src={safe} alt={alt ?? ""} loading="lazy" decoding="async" /> : null;
  },
  // A paragraph whose only content is a whitelisted video link becomes an embedded player.
  p: ({ node, children }) => {
    const only = node?.children?.length === 1 ? node.children[0] : null;
    if (only && only.type === "element" && only.tagName === "a") {
      const href = String(only.properties?.href ?? "");
      if (videoEmbedUrl(href)) return <VideoEmbedPlayer url={href} />;
    }
    return <p>{children}</p>;
  },
};

export function Markdown({ source }: { source: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{source}</ReactMarkdown>;
}
