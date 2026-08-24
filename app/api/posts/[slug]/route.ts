import { NextResponse } from "next/server";
import { canManage } from "../../../../lib/auth.server";
import { slugify } from "../../../../lib/markdown";
import {
  getPost,
  PostSlugConflictError,
  updatePost,
} from "../../../../lib/posts.server";

type RouteContext = { params: Promise<{ slug: string }> };

function value(input: Record<string, unknown>, key: string): string {
  return typeof input[key] === "string" ? input[key].trim() : "";
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const post = await getPost(slug, await canManage());
  return post
    ? NextResponse.json({ post })
    : NextResponse.json({ error: "Post not found." }, { status: 404 });
}

export async function PUT(request: Request, { params }: RouteContext) {
  if (!(await canManage())) {
    return NextResponse.json({ error: "Manager authentication required." }, { status: 401 });
  }

  const { slug: originalSlug } = await params;
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

  try {
    const post = await updatePost(decodeURIComponent(originalSlug), {
      title,
      body,
      slug,
      excerpt: value(input, "excerpt"),
      tag: (value(input, "tag") || "COMMUNITY").toUpperCase(),
      author: value(input, "author"),
      status: value(input, "status") === "published" ? "published" : "draft",
    });
    return post
      ? NextResponse.json({ post })
      : NextResponse.json({ error: "Post not found." }, { status: 404 });
  } catch (error) {
    if (error instanceof PostSlugConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
