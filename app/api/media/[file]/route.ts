import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { mediaFileNamePattern, mediaMime, uploadsDir } from "../../../lib/media-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!mediaFileNamePattern().test(file)) return new Response("Not found", { status: 404 });

  try {
    const data = await readFile(join(uploadsDir(), file));
    return new Response(new Uint8Array(data), {
      headers: { "content-type": mediaMime(file), "cache-control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
