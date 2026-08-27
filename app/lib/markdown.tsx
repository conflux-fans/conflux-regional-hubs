import { Fragment, type ReactNode } from "react";

function safeLink(value: string) {
  try {
    const parsed = new URL(value, "https://kudihub.invalid");
    if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) return "";
    return value.startsWith("/") ? value : parsed.toString();
  } catch {
    return "";
  }
}

export function renderInlineMarkdown(value: string): ReactNode[] {
  const token = /(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*)/;
  const parts: ReactNode[] = [];
  let remaining = value;
  let index = 0;
  while (remaining) {
    const match = remaining.match(token);
    if (!match || match.index === undefined) { parts.push(remaining); break; }
    if (match.index > 0) parts.push(remaining.slice(0, match.index));
    const raw = match[0];
    const link = raw.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = safeLink(link[2]);
      parts.push(href ? <a key={`md-${index}`} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>{link[1]}</a> : raw);
    } else if ((raw.startsWith("**") && raw.endsWith("**")) || (raw.startsWith("__") && raw.endsWith("__"))) {
      parts.push(<strong key={`md-${index}`}>{renderInlineMarkdown(raw.slice(2, -2))}</strong>);
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      parts.push(<code key={`md-${index}`}>{raw.slice(1, -1)}</code>);
    } else if (raw.startsWith("*") && raw.endsWith("*")) {
      parts.push(<em key={`md-${index}`}>{renderInlineMarkdown(raw.slice(1, -1))}</em>);
    }
    remaining = remaining.slice(match.index + raw.length);
    index += 1;
  }
  return parts;
}

function special(line: string) {
  return /^(#{1,3}\s+|```|>\s?|[-*]\s+|\d+\.\s+|---+$)/.test(line.trim());
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let cursor = 0;
  while (cursor < lines.length) {
    const line = lines[cursor];
    const trimmed = line.trim();
    if (!trimmed) { cursor += 1; continue; }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const code: string[] = [];
      cursor += 1;
      while (cursor < lines.length && !lines[cursor].trim().startsWith("```")) { code.push(lines[cursor]); cursor += 1; }
      cursor += 1;
      blocks.push(<pre key={`block-${cursor}`} data-language={language || undefined}><code>{code.join("\n")}</code></pre>);
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const children = renderInlineMarkdown(heading[2]);
      blocks.push(heading[1].length === 1 ? <h2 key={`block-${cursor}`}>{children}</h2> : heading[1].length === 2 ? <h3 key={`block-${cursor}`}>{children}</h3> : <h4 key={`block-${cursor}`}>{children}</h4>);
      cursor += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) { blocks.push(<hr key={`block-${cursor}`} />); cursor += 1; continue; }

    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = [];
      while (cursor < lines.length && /^>\s?/.test(lines[cursor].trim())) { quote.push(lines[cursor].trim().replace(/^>\s?/, "")); cursor += 1; }
      blocks.push(<blockquote key={`block-${cursor}`}>{renderInlineMarkdown(quote.join(" "))}</blockquote>);
      continue;
    }

    const unordered = /^[-*]\s+/.test(trimmed);
    const ordered = /^\d+\.\s+/.test(trimmed);
    if (unordered || ordered) {
      const items: string[] = [];
      const pattern = unordered ? /^[-*]\s+/ : /^\d+\.\s+/;
      while (cursor < lines.length && pattern.test(lines[cursor].trim())) { items.push(lines[cursor].trim().replace(pattern, "")); cursor += 1; }
      const children = items.map((item, index) => <li key={index}>{renderInlineMarkdown(item)}</li>);
      blocks.push(ordered ? <ol key={`block-${cursor}`}>{children}</ol> : <ul key={`block-${cursor}`}>{children}</ul>);
      continue;
    }

    const paragraph = [trimmed];
    cursor += 1;
    while (cursor < lines.length && lines[cursor].trim() && !special(lines[cursor])) { paragraph.push(lines[cursor].trim()); cursor += 1; }
    blocks.push(<p key={`block-${cursor}`}>{renderInlineMarkdown(paragraph.join(" "))}</p>);
  }
  return <Fragment>{blocks}</Fragment>;
}
