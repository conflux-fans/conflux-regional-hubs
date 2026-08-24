import { NextResponse } from "next/server";
import { canManage } from "../../../lib/auth.server";
import { slugify } from "../../../lib/markdown";
import { listPosts, savePost } from "../../../lib/posts.server";

function value(input: Record<string, unknown>, key: string): string {
  return typeof input[key] === "string" ? input[key].trim() : "";
}

export async function GET(request: Request) {
  const wantsDrafts = new URL(request.url).searchParams.get("includeDrafts") === "1";
  if (wantsDrafts && !(await canManage())) {
    return NextResponse.json({ error: "Manager authentication required." }, { status: 401 });
  }
  return NextResponse.json({ posts: await listPosts(wantsDrafts) });
}

export async function POST(request: Request) {
  if (!(await canManage())) {
    return NextResponse.json({ error: "Manager authentication required." }, { status: 401 });
  }

  const input = (await request.json()) as Record<string, unknown>;
  const title = value(input, "title");
  const body = value(input, "body");
  const slug = slugify(value(input, "slug") || title);
  if (!title || !body || !slug) {
    return NextResponse.json(
      { error: "Title, slug and article body are required." },
      { status: 400 },
    );
  }

  const post = await savePost({
    title,
    body,
    slug,
    excerpt: value(input, "excerpt"),
    tag: (value(input, "tag") || "COMMUNITY").toUpperCase(),
    author: value(input, "author"),
    status: value(input, "status") === "published" ? "published" : "draft",
  });
  return NextResponse.json({ post }, { status: 201 });
}
