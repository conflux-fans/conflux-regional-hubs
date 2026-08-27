"use client";

import { useState } from "react";

export function PromptActions({ prompt, projectName }: { prompt: string; projectName: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function download() {
    const blob = new Blob([prompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "regional-hub"}-developer-prompt.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="submission-actions"><button type="button" onClick={copy}>{copied ? "Copied ✓" : "Copy developer prompt"}</button><button type="button" onClick={download}>Download .md</button></div>;
}
