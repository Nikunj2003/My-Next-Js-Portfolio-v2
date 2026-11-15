import { NextResponse } from "next/server";
import { BlobNotFoundError, get } from "@vercel/blob";
import { artifactFilenameSchema, artifactPathname, artifactSlugSchema } from "@/lib/artifacts";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ slug: string; file: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug, file } = await params;

  const slugResult = artifactSlugSchema.safeParse(slug);
  const fileResult = artifactFilenameSchema.safeParse(file);

  if (!slugResult.success || !fileResult.success) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const pathname = artifactPathname(slugResult.data, fileResult.data);

  try {
    const blob = await get(pathname, { access: "public" });

    if (!blob || !blob.stream) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return new NextResponse(blob.stream, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Stored HTML is served from this origin: sandbox it into an opaque
        // origin so its scripts cannot reach the site's cookies or storage.
        // No fetch/XHR/WebSocket and no form posts: a hosted report renders
        // itself, it never needs to send anything anywhere.
        "Content-Security-Policy": "sandbox allow-scripts allow-popups; connect-src 'none'; form-action 'none'",
        "X-Content-Type-Options": "nosniff",
        // Re-hosting overwrites in place, so keep this short: fresh enough to
        // pick up an update quickly, but still cacheable between requests.
        "Cache-Control": "public, max-age=60, must-revalidate",
      },
    });
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    console.error("Artifact proxy fetch failed", error);
    return NextResponse.json({ error: "Something went wrong while loading this report." }, { status: 502 });
  }
}
