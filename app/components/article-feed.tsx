import type { RegionalArticle } from "../lib/articles";
import type { RegionalConfig } from "../regional";

export function ArticleFeed({ articles, region }: { articles: RegionalArticle[]; region: RegionalConfig }) {
  if (!articles.length) {
    return (
      <div className="feed-empty">
        <span>FEED / {region.code}</span>
        <div><h3>No regional feed connected.</h3><p>Add this region’s blog feed and published articles will appear here automatically.</p></div>
      </div>
    );
  }

  return (
    <div className="feed-grid">
      {articles.slice(0, 6).map((article, index) => (
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
