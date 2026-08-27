import { NextResponse } from "next/server";
import { getAuthorizedEditor } from "../../lib/editor-auth";
import { createVibePrompt, saveLocalArticle, saveRegionalBrief, saveRegionalContent, saveRegionalContributors, saveRegionalModules, type EditableRegionalContent, type RegionalBriefInput, type RegionalContributor, type RegionalModule } from "../../lib/content";
import { resolveRegion } from "../../regional";

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const editor = await getAuthorizedEditor();
  const payload = await request.json() as Record<string, unknown>;
  const region = resolveRegion(typeof payload.region === "string" ? payload.region : undefined);

  if (payload.action === "submit-brief") {
    const input: RegionalBriefInput = {
      submitterName: text(payload.submitterName, 100),
      submitterEmail: text(payload.submitterEmail, 180).toLowerCase(),
      submitterContact: text(payload.submitterContact, 300),
      projectName: text(payload.projectName, 80),
      domain: text(payload.domain, 100),
      primaryLanguage: text(payload.primaryLanguage, 60),
      secondaryLanguages: text(payload.secondaryLanguages, 120),
      logoDirection: text(payload.logoDirection, 1200),
      assetLinks: text(payload.assetLinks, 1600),
      primaryColor: text(payload.primaryColor, 80),
      secondaryColor: text(payload.secondaryColor, 80),
      colorsToAvoid: text(payload.colorsToAvoid, 500),
      personality: text(payload.personality, 1000),
      backgroundConcept: text(payload.backgroundConcept, 1600),
      localSymbols: text(payload.localSymbols, 1200),
      referenceSites: text(payload.referenceSites, 1600),
      audience: text(payload.audience, 1000),
      homepagePriority: text(payload.homepagePriority, 1000),
      heroHeadline: text(payload.heroHeadline, 180),
      heroIntro: text(payload.heroIntro, 500),
      journalName: text(payload.journalName, 80),
      stakingName: text(payload.stakingName, 80),
      localSections: text(payload.localSections, 1200),
      mobileNotes: text(payload.mobileNotes, 1200),
      finalNotes: text(payload.finalNotes, 2000),
    };
    const required = [input.submitterName, input.submitterEmail, input.projectName, input.domain, input.primaryLanguage, input.logoDirection, input.primaryColor, input.secondaryColor, input.personality, input.backgroundConcept, input.localSymbols, input.audience, input.homepagePriority, input.heroHeadline, input.heroIntro, input.journalName, input.stakingName];
    if (required.some((value) => !value)) return NextResponse.json({ error: "Complete the required questions before generating the brief." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.submitterEmail)) return NextResponse.json({ error: "Enter a valid email address so the submission can be identified." }, { status: 400 });
    const generatedPrompt = createVibePrompt(region === "korea" ? "Korea" : "Africa", input);
    const briefId = await saveRegionalBrief(region, input, generatedPrompt);
    return NextResponse.json({ ok: true, briefId, prompt: editor ? generatedPrompt : undefined });
  }

  if (!editor) return NextResponse.json({ error: "Editor authorization required." }, { status: 403 });

  if (payload.action === "save-article" || payload.action === "publish-article") {
    const input = { title: text(payload.title, 140), excerpt: text(payload.excerpt, 320), body: text(payload.body, 24000) };
    const status = payload.status === "draft" ? "draft" : "published";
    if (!input.title || !input.excerpt || (status === "published" && input.body.length < 40)) return NextResponse.json({ error: status === "draft" ? "Add a title and summary before saving the draft." : "Add a title, summary, and complete article body." }, { status: 400 });
    const saved = await saveLocalArticle(region, { id: typeof payload.id === "number" ? payload.id : undefined, ...input, status }, editor.email);
    return NextResponse.json({ ok: true, article: { ...saved, ...input, region, authorEmail: editor.email, status }, url: status === "published" ? `/journal/${saved.slug}?region=${region}` : undefined });
  }

  if (payload.action === "save-content") {
    const source = typeof payload.content === "object" && payload.content ? payload.content as Record<string, unknown> : {};
    const input: EditableRegionalContent = {
      wordmark: text(source.wordmark, 80), headline: text(source.headline, 180), intro: text(source.intro, 500), heroEyebrow: text(source.heroEyebrow, 100),
      journalLabel: text(source.journalLabel, 80), journalTitle: text(source.journalTitle, 180), journalEyebrow: text(source.journalEyebrow, 100),
      stakeLabel: text(source.stakeLabel, 80), stakeEyebrow: text(source.stakeEyebrow, 100), stakeHeading: text(source.stakeHeading, 180),
      stakeIntro: text(source.stakeIntro, 500), footerText: text(source.footerText, 500),
    };
    if (Object.values(input).some((value) => !value)) return NextResponse.json({ error: "Complete every visible text field before saving." }, { status: 400 });
    await saveRegionalContent(region, input, editor.email);
    return NextResponse.json({ ok: true });
  }

  if (payload.action === "save-contributors") {
    const raw = Array.isArray(payload.contributors) ? payload.contributors : [];
    if (raw.length > 20) return NextResponse.json({ error: "A regional hub can show up to 20 contributors." }, { status: 400 });
    const contributors = raw.flatMap((value, index): RegionalContributor[] => {
      if (!value || typeof value !== "object") return [];
      const row = value as Record<string, unknown>;
      const photoInput = text(row.photoUrl, 1000);
      let photoUrl = "";
      if (photoInput) { try { const parsed = new URL(photoInput); if (["http:", "https:"].includes(parsed.protocol)) photoUrl = parsed.toString(); } catch { /* invalid URL handled below */ } }
      return [{ id: index, name: text(row.name, 100), role: text(row.role, 140), shortBio: text(row.shortBio, 500), fullBio: text(row.fullBio, 3000), photoUrl, isVisible: row.isVisible !== false }];
    });
    if (contributors.some((item) => !item.name || !item.role || !item.shortBio || !item.fullBio) || contributors.length !== raw.length) return NextResponse.json({ error: "Complete the name, role, short bio, and detailed biography for every contributor." }, { status: 400 });
    if (raw.some((value) => value && typeof value === "object" && text((value as Record<string, unknown>).photoUrl, 1000) && !contributors[raw.indexOf(value)]?.photoUrl)) return NextResponse.json({ error: "Contributor portrait links must use a complete http or https URL." }, { status: 400 });
    await saveRegionalContributors(region, contributors, editor.email);
    return NextResponse.json({ ok: true });
  }

  if (payload.action === "save-modules") {
    const allowedKeys = new Set(["journal", "stake", "contributors", "instagram", "twitter", "youtube", "events", "newsletter"]);
    const allowedLayouts = new Set(["grid", "carousel", "list"]);
    const raw = Array.isArray(payload.modules) ? payload.modules : [];
    const modules = raw.flatMap((value, position): RegionalModule[] => {
      if (!value || typeof value !== "object") return [];
      const row = value as Record<string, unknown>;
      const moduleKey = text(row.moduleKey, 30) as RegionalModule["moduleKey"];
      if (!allowedKeys.has(moduleKey)) return [];
      const layout = text(row.layout, 20) as RegionalModule["layout"];
      return [{ moduleKey, enabled: row.enabled === true, position, title: text(row.title, 100), subtitle: text(row.subtitle, 300), source: text(row.source, 500), layout: allowedLayouts.has(layout) ? layout : "grid" }];
    });
    if (modules.length !== allowedKeys.size || modules.some((module) => !module.title)) return NextResponse.json({ error: "Module settings are incomplete." }, { status: 400 });
    await saveRegionalModules(region, modules, editor.email);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown studio action." }, { status: 400 });
}
