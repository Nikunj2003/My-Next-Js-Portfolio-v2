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
