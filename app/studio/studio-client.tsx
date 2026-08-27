"use client";

import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import type { RegionalConfig } from "../regional";
import type { EditableRegionalContent, RegionalContributor, RegionalModule } from "../lib/content";
import type { LocalArticle } from "../lib/content";
import { ArticleEditor } from "./article-editor";

type Status = { tone: "idle" | "busy" | "ok" | "error"; message: string };
type StudioMode = "setup" | "manage";
type ManagerPanel = "journal" | "content" | "contributors" | "modules" | "connections";

type SetupData = {
  submitterName: string; submitterEmail: string; submitterContact: string;
  projectName: string; domain: string; primaryLanguage: string; secondaryLanguages: string;
  logoDirection: string; assetLinks: string; primaryColor: string; secondaryColor: string;
  colorsToAvoid: string; personality: string; backgroundConcept: string; localSymbols: string;
  referenceSites: string; audience: string; homepagePriority: string; journalName: string;
  stakingName: string; localSections: string; mobileNotes: string; finalNotes: string;
  heroHeadline: string; heroIntro: string; theme: "light" | "dark"; modules: string[];
  instagram: string; twitter: string; youtube: string;
};

const palettes = [
  { name: "Electric future", primary: "#3558ff", secondary: "#c9ff63" },
  { name: "Warm editorial", primary: "#ff684f", secondary: "#f4c95d" },
  { name: "Ocean signal", primary: "#087e8b", secondary: "#b8f2e6" },
  { name: "Night market", primary: "#7655ff", secondary: "#ffcc57" },
];
const setupSteps = ["Identity", "Visual direction", "Homepage", "Modules", "Review"];

async function submit(payload: Record<string, unknown>) {
  const response = await fetch("/api/studio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json() as { ok?: boolean; error?: string; url?: string; prompt?: string; briefId?: number };
  if (!response.ok) throw new Error(data.error || "Could not save changes.");
  return data;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="setup-field"><span>{label}</span>{hint && <small>{hint}</small>}{children}</label>;
}

function ColorChoice({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="color-choice"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Choose ${label.toLowerCase()}`} /><span className="color-choice-swatch" style={{ background: value }} aria-hidden="true" /><span><b>{label}</b><small>Tap to choose</small></span><i aria-hidden="true">↗</i></label>;
}

function luminance(hex: string) {
  const channels = hex.replace("#", "").match(/.{2}/g)?.map((part) => parseInt(part, 16) / 255) ?? [0, 0, 0];
  return channels.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

export function StudioClient({ region, initialContent, initialModules, initialContributors, initialArticles = [], setupOnly = false }: { region: RegionalConfig; initialContent: EditableRegionalContent; initialModules: RegionalModule[]; initialContributors: RegionalContributor[]; initialArticles?: LocalArticle[]; setupOnly?: boolean }) {
  const [mode, setMode] = useState<StudioMode>("setup");
  const [setupStep, setSetupStep] = useState(0);
  const [managerPanel, setManagerPanel] = useState<ManagerPanel>("journal");
  const [briefStatus, setBriefStatus] = useState<Status>({ tone: "idle", message: "" });
  const [managerStatus, setManagerStatus] = useState<Status>({ tone: "idle", message: "" });
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [managerContent, setManagerContent] = useState(initialContent);
  const [managerModules, setManagerModules] = useState(initialModules);
  const [managerContributors, setManagerContributors] = useState(initialContributors);
  const [setup, setSetup] = useState<SetupData>({
    submitterName: "", submitterEmail: "", submitterContact: "",
    projectName: region.wordmark, domain: region.domain, primaryLanguage: region.language, secondaryLanguages: "",
    logoDirection: "", assetLinks: "", primaryColor: region.accent, secondaryColor: region.secondary,
    colorsToAvoid: "", personality: "", backgroundConcept: "", localSymbols: "", referenceSites: "",
    audience: "", homepagePriority: "", journalName: region.journalLabel, stakingName: region.stakeLabel,
    localSections: "", mobileNotes: "", finalNotes: "", heroHeadline: region.headline, heroIntro: region.intro,
    theme: region.key === "africa" ? "dark" : "light", modules: ["journal", "stake", "contributors"], instagram: "", twitter: "", youtube: "",
  });

  const previewStyle = useMemo(() => ({
    "--preview-primary": setup.primaryColor, "--preview-secondary": setup.secondaryColor,
    "--preview-bg": setup.theme === "dark" ? "#101414" : "#f5f3eb", "--preview-text": setup.theme === "dark" ? "#fffef8" : "#111617",
  }) as CSSProperties, [setup.primaryColor, setup.secondaryColor, setup.theme]);
  const primaryOnWhite = contrast(setup.primaryColor, "#ffffff");
  const primaryText = primaryOnWhite >= 4.5 ? "#ffffff" : "#111617";

  function update<K extends keyof SetupData>(key: K, value: SetupData[K]) { setSetup((current) => ({ ...current, [key]: value })); }
  function toggleModule(module: string) {
    if (["journal", "stake"].includes(module)) return;
    update("modules", setup.modules.includes(module) ? setup.modules.filter((item) => item !== module) : [...setup.modules, module]);
  }

  async function submitBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (setupStep < setupSteps.length - 1) { setSetupStep((step) => step + 1); return; }
    setBriefStatus({ tone: "busy", message: "Creating your regional website package…" });
    try {
      const result = await submit({
        action: "submit-brief", region: region.key, ...setup,
        localSections: [...setup.modules.filter((module) => !["journal", "stake", "contributors"].includes(module)), setup.localSections].filter(Boolean).join(", "),
        finalNotes: `${setup.finalNotes}\nTheme preference: ${setup.theme}. Social sources — Instagram: ${setup.instagram || "not supplied"}; X: ${setup.twitter || "not supplied"}; YouTube: ${setup.youtube || "not supplied"}.`,
      });
      setPrompt(result.prompt || "");
      setBriefStatus({ tone: "ok", message: setupOnly ? `Submitted successfully. Reference #${result.briefId}. The hub coordinator can now review your answers and forward the generated prompt to the developer.` : `Setup package #${result.briefId} is saved in the submissions inbox.` });
    } catch (error) { setBriefStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not create the setup package." }); }
  }

  async function copyPrompt() { await navigator.clipboard.writeText(prompt); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setManagerStatus({ tone: "busy", message: "Saving website text…" });
    try { await submit({ action: "save-content", region: region.key, content: managerContent }); setManagerStatus({ tone: "ok", message: "Website text saved. The public pages now use this copy." }); }
    catch (error) { setManagerStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not save website text." }); }
  }

  async function saveModules() {
    setManagerStatus({ tone: "busy", message: "Saving page modules…" });
    try { await submit({ action: "save-modules", region: region.key, modules: managerModules }); setManagerStatus({ tone: "ok", message: "Module settings saved." }); }
    catch (error) { setManagerStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not save modules." }); }
  }

  async function saveContributors() {
    setManagerStatus({ tone: "busy", message: "Saving contributor profiles…" });
    try { await submit({ action: "save-contributors", region: region.key, contributors: managerContributors }); setManagerStatus({ tone: "ok", message: "Contributor profiles saved." }); }
    catch (error) { setManagerStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not save contributors." }); }
  }

  function changeContributor(id: number, updateValue: Partial<RegionalContributor>) { setManagerContributors((current) => current.map((item) => item.id === id ? { ...item, ...updateValue } : item)); }
  function addContributor() { setManagerContributors((current) => [...current, { id: -Date.now(), name: "", role: "", shortBio: "", fullBio: "", photoUrl: "", isVisible: true }]); }
  function removeContributor(id: number) { setManagerContributors((current) => current.filter((item) => item.id !== id)); }
  function moveContributor(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= managerContributors.length) return;
    setManagerContributors((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }

  function changeContent(field: keyof EditableRegionalContent, value: string) { setManagerContent((current) => ({ ...current, [field]: value })); }
  function changeModule(key: RegionalModule["moduleKey"], updateValue: Partial<RegionalModule>) { setManagerModules((current) => current.map((item) => item.moduleKey === key ? { ...item, ...updateValue } : item)); }
  function moveModule(index: number, direction: -1 | 1) {
    const target = index + direction; if (target < 0 || target >= managerModules.length) return;
    setManagerModules((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next.map((item, position) => ({ ...item, position })); });
  }

  return <div className="studio-console">
    <nav className="studio-mode-switch" aria-label="Regional website workflow">
      <button type="button" className={mode === "setup" ? "active" : ""} onClick={() => setMode("setup")}><span>01</span><b>First-time setup</b><small>Design and developer handoff</small></button>
      {!setupOnly && <button type="button" className={mode === "manage" ? "active" : ""} onClick={() => setMode("manage")}><span>02</span><b>Manage website</b><small>Everyday content and modules</small></button>}
    </nav>

    {mode === "setup" ? <form className="setup-shell" onSubmit={submitBrief}>
      <aside className="setup-steps"><p>WEBSITE CREATOR</p><ol>{setupSteps.map((step, index) => <li key={step} className={setupStep === index ? "active" : setupStep > index ? "done" : ""}><button type="button" onClick={() => setSetupStep(index)}><span>{setupStep > index ? "✓" : `0${index + 1}`}</span>{step}</button></li>)}</ol><div><b>{Math.round(((setupStep + 1) / setupSteps.length) * 100)}% complete</b><span><i style={{ width: `${((setupStep + 1) / setupSteps.length) * 100}%` }} /></span></div></aside>

      <section className="setup-stage">
        {setupStep === 0 && <div className="submitter-details"><div className="setup-heading compact"><span>YOUR SUBMISSION</span><h2>Who should we contact?</h2><p>Your answers will be saved for the hub coordinator, who will forward the generated prompt to the developer.</p></div><div className="setup-grid"><Field label="Your name"><input value={setup.submitterName} onChange={(event) => update("submitterName", event.target.value)} placeholder="Regional lead name" required /></Field><Field label="Your email"><input type="email" value={setup.submitterEmail} onChange={(event) => update("submitterEmail", event.target.value)} placeholder="name@example.com" required /></Field></div><Field label="Preferred contact" hint="Optional — Telegram, Discord, WeChat, or another contact"><input value={setup.submitterContact} onChange={(event) => update("submitterContact", event.target.value)} placeholder="@handle or contact link" /></Field></div>}
        {setupStep === 0 && <><div className="setup-heading"><span>STEP 01 / IDENTITY</span><h2>Give your region a name people remember.</h2><p>Start with the essentials. Your development team will receive these details in a clean regional package.</p></div><div className="setup-grid"><Field label="Website name"><input value={setup.projectName} onChange={(event) => update("projectName", event.target.value)} placeholder="e.g. Conflux Korea" required /></Field><Field label="Intended domain"><input value={setup.domain} onChange={(event) => update("domain", event.target.value)} placeholder="e.g. confluxkorea.kr" required /></Field><Field label="Primary language"><input value={setup.primaryLanguage} onChange={(event) => update("primaryLanguage", event.target.value)} placeholder="e.g. Korean" required /></Field><Field label="Secondary languages" hint="Optional"><input value={setup.secondaryLanguages} onChange={(event) => update("secondaryLanguages", event.target.value)} placeholder="e.g. English summaries" /></Field></div><Field label="What should the logo feel like?" hint="Describe the symbol, lettering and local meaning."><textarea value={setup.logoDirection} onChange={(event) => update("logoDirection", event.target.value)} rows={4} placeholder="A bold local symbol combined with subtle Conflux geometry…" required /></Field><Field label="Logo, moodboard or asset links" hint="Optional — one link per line"><textarea value={setup.assetLinks} onChange={(event) => update("assetLinks", event.target.value)} rows={3} placeholder="Paste links to your shared asset folder" /></Field></>}

        {setupStep === 1 && <><div className="setup-heading"><span>STEP 02 / VISUAL DIRECTION</span><h2>Choose colors by sight, not by code.</h2><p>Pick directly from the color controls or begin with a suggested palette. Technical color values are handled automatically.</p></div><div className="color-picker-grid"><ColorChoice label="Primary color" value={setup.primaryColor} onChange={(value) => update("primaryColor", value)} /><ColorChoice label="Accent color" value={setup.secondaryColor} onChange={(value) => update("secondaryColor", value)} /></div><div className="palette-panel"><span>SUGGESTED PALETTES</span><div>{palettes.map((palette) => <button type="button" key={palette.name} onClick={() => setSetup((current) => ({ ...current, primaryColor: palette.primary, secondaryColor: palette.secondary }))}><i style={{ background: palette.primary }} /><i style={{ background: palette.secondary }} /><b>{palette.name}</b></button>)}</div></div><div className={`contrast-note ${primaryOnWhite >= 4.5 ? "good" : "careful"}`}><span>{primaryOnWhite >= 4.5 ? "✓" : "!"}</span><p><b>{primaryOnWhite >= 4.5 ? "Strong readability" : "We’ll adjust text automatically"}</b>Your selected primary color will use {primaryText === "#ffffff" ? "light" : "dark"} text for better contrast.</p></div><div className="theme-choice"><span>BACKGROUND MOOD</span><div><button type="button" className={setup.theme === "light" ? "active" : ""} onClick={() => update("theme", "light")}><i />Light & editorial</button><button type="button" className={setup.theme === "dark" ? "active" : ""} onClick={() => update("theme", "dark")}><i />Dark & cinematic</button></div></div><Field label="Personality"><textarea value={setup.personality} onChange={(event) => update("personality", event.target.value)} rows={3} placeholder="Modern, confident, culturally grounded…" required /></Field><Field label="Hero or background concept"><textarea value={setup.backgroundConcept} onChange={(event) => update("backgroundConcept", event.target.value)} rows={4} placeholder="Describe the scene, landmark, atmosphere or texture…" required /></Field><Field label="Local symbols and cultural details"><textarea value={setup.localSymbols} onChange={(event) => update("localSymbols", event.target.value)} rows={3} placeholder="What belongs in the design—and what should be avoided?" required /></Field><div className="setup-grid"><Field label="Colors or clichés to avoid" hint="Optional"><input value={setup.colorsToAvoid} onChange={(event) => update("colorsToAvoid", event.target.value)} /></Field><Field label="Reference websites" hint="Optional"><input value={setup.referenceSites} onChange={(event) => update("referenceSites", event.target.value)} /></Field></div></>}

        {setupStep === 2 && <><div className="setup-heading"><span>STEP 03 / HOMEPAGE</span><h2>Decide what visitors see first.</h2><p>All of this regional copy remains editable after deployment.</p></div><Field label="Homepage headline"><input value={setup.heroHeadline} onChange={(event) => update("heroHeadline", event.target.value)} required /></Field><Field label="Short introduction"><textarea value={setup.heroIntro} onChange={(event) => update("heroIntro", event.target.value)} rows={3} required /></Field><Field label="Who is the primary audience?"><textarea value={setup.audience} onChange={(event) => update("audience", event.target.value)} rows={3} placeholder="Local crypto users, builders, students and CFX holders…" required /></Field><Field label="What should visitors notice or do first?"><textarea value={setup.homepagePriority} onChange={(event) => update("homepagePriority", event.target.value)} rows={3} placeholder="Read local stories or stake CFX…" required /></Field><div className="setup-grid"><Field label="Local name for Journal"><input value={setup.journalName} onChange={(event) => update("journalName", event.target.value)} required /></Field><Field label="Local name for Stake"><input value={setup.stakingName} onChange={(event) => update("stakingName", event.target.value)} required /></Field></div></>}

        {setupStep === 3 && <><div className="setup-heading"><span>STEP 04 / MODULES</span><h2>Start simple. Add only what your region needs.</h2><p>Journal, Stake, and Contributors form the protected foundation. Optional modules can be switched on now or added later.</p></div><div className="module-chooser">{[{ key: "journal", name: setup.journalName || "Journal", text: "Publish regional articles", locked: true }, { key: "stake", name: setup.stakingName || "Stake CFX", text: "Protected staking architecture", locked: true }, { key: "contributors", name: "Contributors", text: "Show the people behind the regional hub", locked: true }, { key: "instagram", name: "Instagram", text: "Automatically showcase posts" }, { key: "twitter", name: "X / Twitter", text: "Show regional community updates" }, { key: "youtube", name: "YouTube", text: "Display the latest videos" }, { key: "events", name: "Events", text: "Promote local meetups" }, { key: "newsletter", name: "Newsletter", text: "Collect community sign-ups" }].map((item) => <button type="button" key={item.key} className={setup.modules.includes(item.key) ? "selected" : ""} onClick={() => toggleModule(item.key)}><span>{setup.modules.includes(item.key) ? "✓" : "+"}</span><b>{item.name}</b><small>{item.text}</small>{item.locked && <em>CORE</em>}</button>)}</div>{setup.modules.some((item) => ["instagram", "twitter", "youtube"].includes(item)) && <div className="social-source-box"><span>OPTIONAL ACCOUNT DETAILS</span><p>Your backend team will connect and verify these feeds during deployment.</p>{setup.modules.includes("instagram") && <Field label="Instagram username or profile"><input value={setup.instagram} onChange={(event) => update("instagram", event.target.value)} placeholder="@yourregion" /></Field>}{setup.modules.includes("twitter") && <Field label="X / Twitter username"><input value={setup.twitter} onChange={(event) => update("twitter", event.target.value)} placeholder="@yourregion" /></Field>}{setup.modules.includes("youtube") && <Field label="YouTube channel"><input value={setup.youtube} onChange={(event) => update("youtube", event.target.value)} placeholder="Channel name or URL" /></Field>}</div>}<Field label="Additional regional sections" hint="Optional"><textarea value={setup.localSections} onChange={(event) => update("localSections", event.target.value)} rows={3} placeholder="Community spotlight, universities, local projects…" /></Field></>}

        {setupStep === 4 && <><div className="setup-heading"><span>STEP 05 / REVIEW</span><h2>Your regional package is ready to create.</h2><p>Review the essentials, add final notes, and generate the complete developer handoff.</p></div><div className="review-grid"><article><span>IDENTITY</span><b>{setup.projectName}</b><p>{setup.domain}<br />{setup.primaryLanguage}</p></article><article><span>COLORS</span><div className="review-colors"><i style={{ background: setup.primaryColor }} /><i style={{ background: setup.secondaryColor }} /></div><p>{setup.theme === "dark" ? "Dark & cinematic" : "Light & editorial"}</p></article><article><span>FOUNDATION</span><b>{setup.journalName} + {setup.stakingName} + Contributors</b><p>{Math.max(0, setup.modules.length - 3)} optional modules selected</p></article><article><span>FIRST IMPRESSION</span><b>{setup.heroHeadline}</b><p>{setup.heroIntro}</p></article></div><Field label="Mobile priorities" hint="Optional"><textarea value={setup.mobileNotes} onChange={(event) => update("mobileNotes", event.target.value)} rows={3} placeholder="What must remain visible or especially easy on mobile?" /></Field><Field label="Final direction for the design and development team" hint="Optional"><textarea value={setup.finalNotes} onChange={(event) => update("finalNotes", event.target.value)} rows={4} placeholder="Local sensitivities, deadlines, asset owner or approval process…" /></Field><div className="handoff-flow"><span>AFTER YOU SUBMIT</span><ol><li><b>Regional package</b><small>Your choices become a complete design brief.</small></li><li><b>Developer build</b><small>The regional identity is applied to the shared framework.</small></li><li><b>Backend connection</b><small>Login, feeds, domain and staking are connected.</small></li><li><b>Manager handoff</b><small>Your team can edit content after launch.</small></li></ol></div></>}

        <div className="setup-actions"><button type="button" disabled={setupStep === 0} onClick={() => setSetupStep((step) => Math.max(0, step - 1))}>← Back</button><button className="v2-button v2-button-dark" type="submit">{setupStep === setupSteps.length - 1 ? "Generate developer package" : "Continue"}<span>→</span></button></div>
        {briefStatus.message && <output className={`studio-status ${briefStatus.tone}`}>{briefStatus.message}</output>}
        {prompt && <section className="generated-brief"><div><span>READY FOR VIBE CODING</span><button type="button" onClick={copyPrompt}>{copied ? "Copied ✓" : "Copy prompt"}</button></div><h3>Regional website handoff</h3><pre>{prompt}</pre></section>}
      </section>

      <aside className="setup-preview" style={previewStyle}><div className="preview-toolbar"><span>LIVE PREVIEW</span><div><button type="button" className={!mobilePreview ? "active" : ""} onClick={() => setMobilePreview(false)} aria-label="Desktop preview">▰</button><button type="button" className={mobilePreview ? "active" : ""} onClick={() => setMobilePreview(true)} aria-label="Mobile preview">▯</button></div></div><div className={`preview-device ${mobilePreview ? "mobile" : ""}`}><div className="preview-site-head"><b>{setup.projectName || "REGIONAL HUB"}</b><span>☰</span></div><div className="preview-site-hero"><small>{setup.primaryLanguage || "LOCAL COMMUNITY"}</small><h3>{setup.heroHeadline || "Your regional headline."}</h3><p>{setup.heroIntro || "A short regional introduction appears here."}</p></div><div className="preview-portals"><article style={{ color: primaryText }}><small>01 / READ</small><b>{setup.journalName || "Journal"}</b></article><article><small>02 / PARTICIPATE</small><b>{setup.stakingName || "Stake"}</b></article></div><div className="preview-modules">{setup.modules.filter((item) => !["journal", "stake"].includes(item)).slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div></div><p>Preview is directional. Your developer will apply the full regional imagery, typography and responsive treatment.</p></aside>
    </form> : <section className="manager-shell">
      <aside className="manager-nav"><span>AFTER DEPLOYMENT</span><h2>Manage your website</h2><p>Everyday updates, without touching code.</p>{[["journal", "Journal", "Write and publish"], ["content", "Edit website", "Change visible text"], ["contributors", "Contributors", "Manage people and bios"], ["modules", "Page modules", "Show, hide and reorder"], ["connections", "Social feeds", "Connect your accounts"]].map(([key, label, note]) => <button type="button" key={key} className={managerPanel === key ? "active" : ""} onClick={() => setManagerPanel(key as ManagerPanel)}><span>{label}</span><small>{note}</small><i>→</i></button>)}</aside>
      <div className="manager-panel">
        {managerPanel === "journal" && <ArticleEditor region={region.key} initialArticles={initialArticles} />}
        {managerPanel === "content" && <form className="manager-form" onSubmit={saveContent}><div className="manager-heading"><span>EDIT WEBSITE</span><h2>Change visible text</h2><p>Every regional text field is available here in plain language. Save once and the public pages use the new copy.</p></div><div className="content-editor-group"><span>IDENTITY & HERO</span><Field label="Website name"><input value={managerContent.wordmark} onChange={(event) => changeContent("wordmark", event.target.value)} required /></Field><Field label="Small line above the homepage headline"><input value={managerContent.heroEyebrow} onChange={(event) => changeContent("heroEyebrow", event.target.value)} required /></Field><Field label="Homepage headline"><input value={managerContent.headline} onChange={(event) => changeContent("headline", event.target.value)} required /></Field><Field label="Homepage introduction"><textarea value={managerContent.intro} onChange={(event) => changeContent("intro", event.target.value)} rows={3} required /></Field></div><div className="content-editor-group"><span>JOURNAL</span><div className="setup-grid"><Field label="Navigation name"><input value={managerContent.journalLabel} onChange={(event) => changeContent("journalLabel", event.target.value)} required /></Field><Field label="Section label"><input value={managerContent.journalEyebrow} onChange={(event) => changeContent("journalEyebrow", event.target.value)} required /></Field></div><Field label="Journal section title"><input value={managerContent.journalTitle} onChange={(event) => changeContent("journalTitle", event.target.value)} required /></Field></div><div className="content-editor-group"><span>STAKING</span><div className="setup-grid"><Field label="Navigation name"><input value={managerContent.stakeLabel} onChange={(event) => changeContent("stakeLabel", event.target.value)} required /></Field><Field label="Section label"><input value={managerContent.stakeEyebrow} onChange={(event) => changeContent("stakeEyebrow", event.target.value)} required /></Field></div><Field label="Staking headline"><input value={managerContent.stakeHeading} onChange={(event) => changeContent("stakeHeading", event.target.value)} required /></Field><Field label="Staking explanation"><textarea value={managerContent.stakeIntro} onChange={(event) => changeContent("stakeIntro", event.target.value)} rows={3} required /></Field></div><div className="content-editor-group"><span>FOOTER</span><Field label="Footer text"><textarea value={managerContent.footerText} onChange={(event) => changeContent("footerText", event.target.value)} rows={3} required /></Field></div><div className="protected-note light"><span>✓</span><p><b>Safe text controls</b>Layouts, staking contracts and production styling remain protected.</p></div><button className="v2-button v2-button-dark" type="submit">Save website text <span>→</span></button>{managerStatus.message && <output className={`studio-status ${managerStatus.tone}`}>{managerStatus.message}</output>}</form>}
        {managerPanel === "contributors" && <div className="manager-form"><div className="manager-heading"><span>CONTRIBUTORS</span><h2>Show the people behind the regional hub</h2><p>Add a short introduction for the landing-page card and a fuller biography for the profile pop-up. Paste an approved portrait URL now, or leave it blank until the regional photo is ready.</p></div><div className="contributor-editor-list">{managerContributors.map((item, index) => <article key={item.id}><header><span>PROFILE {String(index + 1).padStart(2, "0")}</span><div><button type="button" disabled={index === 0} onClick={() => moveContributor(index, -1)} aria-label={`Move ${item.name || "profile"} up`}>↑</button><button type="button" disabled={index === managerContributors.length - 1} onClick={() => moveContributor(index, 1)} aria-label={`Move ${item.name || "profile"} down`}>↓</button><button type="button" className={item.isVisible ? "visible" : ""} onClick={() => changeContributor(item.id, { isVisible: !item.isVisible })}>{item.isVisible ? "Visible" : "Hidden"}</button><button type="button" onClick={() => removeContributor(item.id)}>Remove</button></div></header><div className="setup-grid"><Field label="Name"><input value={item.name} onChange={(event) => changeContributor(item.id, { name: event.target.value })} placeholder="Full name" /></Field><Field label="Regional role"><input value={item.role} onChange={(event) => changeContributor(item.id, { role: event.target.value })} placeholder="Conflux Region Lead" /></Field></div><Field label="Short bio" hint="Shown on the landing page"><textarea rows={3} value={item.shortBio} onChange={(event) => changeContributor(item.id, { shortBio: event.target.value })} /></Field><Field label="Detailed biography" hint="Shown in the profile pop-up"><textarea rows={6} value={item.fullBio} onChange={(event) => changeContributor(item.id, { fullBio: event.target.value })} /></Field><Field label="Portrait image URL" hint="Approved square or portrait photo; leave blank for initials"><input type="url" value={item.photoUrl} onChange={(event) => changeContributor(item.id, { photoUrl: event.target.value })} placeholder="https://…" /></Field></article>)}</div><div className="contributor-editor-actions"><button type="button" onClick={addContributor}>+ Add contributor</button><button className="v2-button v2-button-dark" type="button" onClick={saveContributors}>Save contributors <span>→</span></button></div>{managerStatus.message && <output className={`studio-status ${managerStatus.tone}`}>{managerStatus.message}</output>}</div>}
        {managerPanel === "modules" && <div className="manager-form"><div className="manager-heading"><span>PAGE MODULES</span><h2>Build the page from approved sections</h2><p>Move sections, edit their labels, or switch optional modules on and off. Journal, Stake, and Contributors remain protected.</p></div><div className="module-manager module-manager-detailed">{managerModules.map((item, index) => <article key={item.moduleKey}><div className="module-row"><span className="module-order"><button type="button" disabled={index === 0} onClick={() => moveModule(index, -1)} aria-label={`Move ${item.title} up`}>↑</button><button type="button" disabled={index === managerModules.length - 1} onClick={() => moveModule(index, 1)} aria-label={`Move ${item.title} down`}>↓</button></span><span><b>{item.title}</b><small>{["journal", "stake", "contributors"].includes(item.moduleKey) ? "Core foundation" : "Optional module"}</small></span><button type="button" className={item.enabled ? "on" : ""} disabled={["journal", "stake", "contributors"].includes(item.moduleKey)} onClick={() => changeModule(item.moduleKey, { enabled: !item.enabled })} aria-label={`Toggle ${item.title}`}><i /></button></div><div className="module-fields"><Field label="Section title"><input value={item.title} onChange={(event) => changeModule(item.moduleKey, { title: event.target.value })} /></Field><Field label="Short description"><input value={item.subtitle} onChange={(event) => changeModule(item.moduleKey, { subtitle: event.target.value })} /></Field></div></article>)}</div><button className="v2-button v2-button-dark" type="button" onClick={saveModules}>Save module layout <span>→</span></button>{managerStatus.message && <output className={`studio-status ${managerStatus.tone}`}>{managerStatus.message}</output>}</div>}
        {managerPanel === "connections" && <div className="manager-form"><div className="manager-heading"><span>SOCIAL FEEDS</span><h2>Connect once. Update automatically.</h2><p>Add the regional accounts here. The backend team supplies the secure platform credentials during deployment.</p></div><div className="connection-list">{managerModules.filter((item) => ["instagram", "twitter", "youtube"].includes(item.moduleKey)).map((item) => <article key={item.moduleKey}><span>{item.moduleKey.slice(0, 2).toUpperCase()}</span><div><b>{item.title}</b><small>{item.moduleKey === "instagram" ? "Professional Instagram account" : item.moduleKey === "youtube" ? "Channel ID or URL" : "X profile handle or URL"}</small><input value={item.source} onChange={(event) => changeModule(item.moduleKey, { source: event.target.value })} placeholder={item.moduleKey === "youtube" ? "Channel URL" : "@regionalaccount"} /></div><button type="button" className={item.enabled ? "connected" : ""} onClick={() => changeModule(item.moduleKey, { enabled: !item.enabled })}>{item.enabled ? "Shown" : "Hidden"}</button></article>)}</div><div className="feed-health"><span>HOW IT WORKS</span><p>Feeds are fetched in the background and cached, so the website stays fast even if a social platform is temporarily unavailable.</p></div><button className="v2-button v2-button-dark" type="button" onClick={saveModules}>Save feed settings <span>→</span></button>{managerStatus.message && <output className={`studio-status ${managerStatus.tone}`}>{managerStatus.message}</output>}</div>}
      </div>
    </section>}
  </div>;
}
