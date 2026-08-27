/* eslint-disable @next/next/no-img-element */
import type { RegionalModule } from "../lib/content";
import { getSocialFeed, socialProfileUrl, type SocialPlatform } from "../lib/social";

export async function SocialFeed({ modules }: { modules: RegionalModule[] }) {
  const connections = modules.filter((module) => module.enabled && ["instagram", "twitter", "youtube"].includes(module.moduleKey));
  if (!connections.length) return null;
  const feeds = await Promise.all(connections.map(async (module) => ({ module, items: await getSocialFeed(module) })));

  return (
    <section className="social-hub v2-wrap" aria-labelledby="social-hub-title">
      <header className="social-hub-head">
        <div><p className="v2-kicker">LIVE CONNECTIONS / COMMUNITY SIGNAL</p><h2 id="social-hub-title">Follow the conversation.</h2></div>
        <p>Official feeds update automatically when the deployment credentials are connected. Until then, every supplied profile remains a working public link.</p>
      </header>
      <div className="social-platforms">
        {feeds.map(({ module, items }) => {
          const platform = module.moduleKey as SocialPlatform;
          const profileUrl = socialProfileUrl(platform, module.source);
          return <article className={`social-platform social-platform-${platform}`} key={module.moduleKey}>
            <header><span>{platform === "twitter" ? "X" : platform.slice(0, 2).toUpperCase()}</span><div><h3>{module.title}</h3><p>{module.subtitle}</p></div>{profileUrl && <a href={profileUrl} target="_blank" rel="noreferrer">Open profile ↗</a>}</header>
            <div className="social-items">{items.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className={item.isProfileFallback ? "social-item social-profile-fallback" : "social-item"}>{item.imageUrl && /* External social thumbnails are dynamic and cannot use a fixed Next image loader. */ <img src={item.imageUrl} alt="" loading="lazy" />}<span>{item.platform === "twitter" ? "X" : item.platform.toUpperCase()}</span><strong>{item.title}</strong><small>{item.excerpt}</small><b>Open ↗</b></a>)}</div>
          </article>;
        })}
      </div>
    </section>
  );
}
