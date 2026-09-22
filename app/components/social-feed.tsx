/* eslint-disable @next/next/no-img-element */
import type { RegionalModule } from "../lib/content";
import { getSocialFeed, socialProfileUrl, type SocialPlatform } from "../lib/social";

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  if (platform === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>;
  if (platform === "twitter") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4.6l3.1 4.5L16.5 4H19l-5.1 6 5.8 10h-4.6l-3.6-5.2L7 20H4.5l5.7-6.7L5 4Zm3.1 2 7.9 12h1.2L9.3 6H8.1Z" fill="currentColor" /></svg>;
  return <span aria-hidden="true">{platform.slice(0, 2).toUpperCase()}</span>;
}

export async function SocialFeed({ modules, locale = "en" }: { modules: RegionalModule[]; locale?: "en" | "es" }) {
  const connections = modules.filter((module) => module.enabled && ["instagram", "twitter", "youtube"].includes(module.moduleKey));
  if (!connections.length) return null;
  const feeds = await Promise.all(connections.map(async (module) => ({ module, items: await getSocialFeed(module) })));

  return (
    <section className="social-hub v2-wrap" aria-labelledby="social-hub-title">
      <header className="social-hub-head">
        <div><p className="v2-kicker">{locale === "es" ? "CONFLUX / COMUNIDAD" : "LIVE CONNECTIONS / COMMUNITY SIGNAL"}</p><h2 id="social-hub-title">{locale === "es" ? "La conversación sigue." : "Follow the conversation."}</h2></div>
        {locale === "es" && <p>Visita nuestros perfiles oficiales. Las publicaciones se mostrarán aquí cuando la conexión de la plataforma esté habilitada.</p>}
      </header>
      <div className="social-platforms">
        {feeds.map(({ module, items }) => {
          const platform = module.moduleKey as SocialPlatform;
          const profileUrl = socialProfileUrl(platform, module.source);
          return <article className={`social-platform social-platform-${platform}`} key={module.moduleKey}>
            <header><span className="social-platform-icon"><SocialIcon platform={platform} /></span><div><h3>{module.title}</h3><p>{module.subtitle}</p></div>{profileUrl && <a href={profileUrl} target="_blank" rel="noreferrer">Open profile ↗</a>}</header>
            <div className="social-items">{items.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className={item.isProfileFallback ? "social-item social-profile-fallback" : "social-item"}>{item.imageUrl && /* External social thumbnails are dynamic and cannot use a fixed Next image loader. */ <img src={item.imageUrl} alt="" loading="lazy" />}<span>{item.platform === "twitter" ? "X" : item.platform.toUpperCase()}</span><strong>{item.title}</strong><small>{item.excerpt}</small><b>Open ↗</b></a>)}</div>
          </article>;
        })}
      </div>
    </section>
  );
}
