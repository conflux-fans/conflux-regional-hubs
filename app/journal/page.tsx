import Link from "next/link";
import { Footer, Header } from "../site-components";
import { region } from "../../config/regions";
import { listPosts } from "../../lib/posts.server";
export const dynamic="force-dynamic";
export default async function Journal(){const posts=await listPosts();return <main className={`page-shell journal-page-${region.presentation.pages.journal}`}><Header/><section className="inner-hero"><p className="eyebrow">{region.journal.name.toUpperCase()} / {region.region.toUpperCase()}</p><h1>{region.journal.pageHeading}</h1><p>{region.journal.introduction}</p></section><section className="content-narrow">{posts.length?posts.map(post=><article className="article-card" key={post.title}><p className="story-meta">{post.tag}<br/>{post.publishedAt?new Date(post.publishedAt).toLocaleDateString("en",{day:"2-digit",month:"short",year:"numeric"}):"Draft"}</p><div><h2>{post.title}</h2><p>{post.excerpt}</p><Link className="text-link" href={`/journal/${post.slug}`}>Read story ↗</Link></div></article>):<div className="regional-empty"><strong>{region.journal.emptyMessage}</strong></div>}</section><Footer/></main>}
