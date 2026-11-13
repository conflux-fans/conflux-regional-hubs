import Link from "next/link";
import { pageNumbers, type RegionalArticle } from "../lib/articles";
import type { RegionalConfig } from "../regional";

function pagerCopy(region: RegionalConfig) {
  if (region.key === "latam")
    return region.locale === "en"
      ? { label: "Journal pages", prev: "← Previous", next: "Next →" }
      : { label: "Páginas del diario", prev: "← Anterior", next: "Siguiente →" };
  if (region.key === "slovo")
    return region.locale === "uk"
      ? { label: "Сторінки журналу", prev: "← Назад", next: "Далі →" }
      : { label: "Страницы журнала", prev: "← Назад", next: "Вперёд →" };
  return { label: "Journal pages", prev: "← Previous", next: "Next →" };
}

export function ArticlePager({ region, page, pageCount }: { region: RegionalConfig; page: number; pageCount: number }) {
  const copy = pagerCopy(region);
  const href = (target: number) => `/journal?region=${region.key}${target > 1 ? `&page=${target}` : ""}`;
  return (
    <nav className="feed-pagination" aria-label={copy.label}>
      {page > 1 && <Link href={href(page - 1)} rel="prev">{copy.prev}</Link>}
      {pageNumbers(page, pageCount).map((item) =>
        item === "gap" ? (
          <span key="gap" aria-hidden="true">…</span>
        ) : (
          <Link key={item} href={href(item)} aria-current={item === page ? "page" : undefined}>{item}</Link>
        ),
      )}
      {page < pageCount && <Link href={href(page + 1)} rel="next">{copy.next}</Link>}
    </nav>
  );
}

export function ArticleFeed({ articles, region }: { articles: RegionalArticle[]; region: RegionalConfig }) {
  if (!articles.length) {
    return (
      <div className="feed-empty">
        <span>FEED / {region.code}</span>
        {region.key === "latam"
          ? <div><h3>{region.locale === "en" ? "The next story starts here." : "La próxima historia empieza aquí."}</h3><p>{region.locale === "en" ? "Regional articles will appear here when the team publishes them." : "Los artículos de la región aparecerán aquí cuando el equipo los publique."}</p></div>
          : region.key === "slovo"
          ? <div><h3>{region.locale === "uk" ? "Наступна історія починається тут." : "Следующая история начинается здесь."}</h3><p>{region.locale === "uk" ? "Історії з'являться тут, коли команда їх опублікує." : "Истории появятся здесь, когда команда их опубликует."}</p></div>
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
