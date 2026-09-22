import type { RegionalArticle } from "../lib/articles";
import type { RegionalConfig } from "../regional";

export function ArticleFeed({ articles, region }: { articles: RegionalArticle[]; region: RegionalConfig }) {
  if (!articles.length) {
    return (
      <div className="feed-empty">
        <span>FEED / {region.code}</span>
        {region.key === "latam"
          ? <div><h3>{region.locale === "en" ? "The next story starts here." : "La próxima historia empieza aquí."}</h3><p>{region.locale === "en" ? "Regional articles will appear here when the team publishes them." : "Los artículos de la región aparecerán aquí cuando el equipo los publique."}</p></div>
          : <div><h3>No regional feed connected.</h3><p>Add this region’s blog feed and published articles will appear here automatically.</p></div>}
      </div>
    );
  }

  return (
    <div className="feed-grid">
      {articles.map((article, index) => (
        <a href={article.url} key={`${article.url}-${index}`} target={article.external ? "_blank" : undefined} rel={article.external ? "noreferrer" : undefined} className={index === 0 ? "feed-card feed-card-featured" : "feed-card"}>
          <span>{article.date || `0${index + 1}`}</span>
          <h3>{article.title}</h3>
          {article.excerpt && <p>{article.excerpt}</p>}
          <b>↗</b>
        </a>
      ))}
    </div>
  );
}
