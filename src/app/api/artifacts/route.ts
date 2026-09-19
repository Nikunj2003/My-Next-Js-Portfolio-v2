import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { BlobNotFoundError, get, head, put } from "@vercel/blob";
import {
  artifactPathname,
  artifactUploadSchema,
  isValidArtifactHtml,
  MAX_NEW_HOSTS_PER_DAY,
  MAX_UPDATES_PER_DAY,
  todayCounterPathname,
  type ArtifactDailyCounters,
} from "@/lib/artifacts";
import { checkRateLimit, getClientKey, getRateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Cheap first-line defense against bursts from a single warm instance. The
// authoritative, durable limit is the daily counter check below.
const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 60_000;

const requestStore = new Map<string, { count: number; resetAt: number }>();

function safeEqual(a: string, b: string) {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

async function blobExists(pathname: string) {
  try {
    await head(pathname);
    return true;
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return false;
    }
    throw error;
  }
}

async function readCounters(pathname: string): Promise<ArtifactDailyCounters> {
  try {
    const result = await get(pathname, { access: "public" });
    if (!result || !result.stream) {
      return { newHosts: 0, updates: 0 };
    }

    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text) as Partial<ArtifactDailyCounters>;
    return {
      newHosts: Number.isFinite(parsed.newHosts) ? Number(parsed.newHosts) : 0,
      updates: Number.isFinite(parsed.updates) ? Number(parsed.updates) : 0,
    };
  } catch {
    // Missing/unparseable counter file just means "no writes recorded yet today".
    return { newHosts: 0, updates: 0 };
  }
}

async function writeCounters(pathname: string, counters: ArtifactDailyCounters) {
  await put(pathname, JSON.stringify(counters), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export async function POST(request: Request) {
  const rateLimitResult = checkRateLimit(requestStore, getClientKey(request), {
    limit: RATE_LIMIT,
    windowMs: WINDOW_MS,
  });
  const rateLimitHeaders = getRateLimitHeaders(RATE_LIMIT, rateLimitResult.remaining, rateLimitResult.resetAt);

  if (rateLimitResult.limited) {
    return NextResponse.json(
      { error: "Too many upload requests. Please wait before trying again." },
      { status: 429, headers: { ...rateLimitHeaders, "Retry-After": String(rateLimitResult.retryAfter) } }
    );
  }

  const uploadToken = process.env.ARTIFACT_UPLOAD_TOKEN?.trim();
  if (!uploadToken) {
    return NextResponse.json(
      { error: "Artifact hosting is not configured on the server yet." },
      { status: 503, headers: rateLimitHeaders }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const providedToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!providedToken || !safeEqual(providedToken, uploadToken)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: rateLimitHeaders });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!blobToken) {
    return NextResponse.json(
      { error: "Artifact storage is not configured on the server yet." },
      { status: 503, headers: rateLimitHeaders }
    );
  }

  try {
    const body = await request.json();
    const parsed = artifactUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid upload payload." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const { slug, filename, contentBase64 } = parsed.data;

    let buffer: Buffer;
    let decoded: string;
    try {
      buffer = Buffer.from(contentBase64, "base64");
      decoded = buffer.toString("utf-8");
    } catch {
      return NextResponse.json({ error: "File content is not valid base64." }, { status: 400, headers: rateLimitHeaders });
    }

    if (!isValidArtifactHtml(decoded)) {
      return NextResponse.json(
        { error: "File content does not look like an HTML document." },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const pathname = artifactPathname(slug, filename);
    const isUpdate = await blobExists(pathname);

    const counterPathname = todayCounterPathname();
    const counters = await readCounters(counterPathname);

    if (isUpdate && counters.updates >= MAX_UPDATES_PER_DAY) {
      return NextResponse.json(
        { error: `Daily limit reached: ${MAX_UPDATES_PER_DAY} report updates per day. Try again tomorrow.` },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    if (!isUpdate && counters.newHosts >= MAX_NEW_HOSTS_PER_DAY) {
      return NextResponse.json(
        { error: `Daily limit reached: ${MAX_NEW_HOSTS_PER_DAY} new hosted reports per day. Try again tomorrow.` },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    await put(pathname, buffer, {
      access: "public",
      contentType: "text/html; charset=utf-8",
      allowOverwrite: true,
      token: blobToken,
    });

    const nextCounters: ArtifactDailyCounters = isUpdate
      ? { ...counters, updates: counters.updates + 1 }
      : { ...counters, newHosts: counters.newHosts + 1 };

    // Best-effort: a failed counter write should not fail the upload that already succeeded.
    try {
      await writeCounters(counterPathname, nextCounters);
    } catch (error) {
      console.error("Failed to update artifact daily counters", error);
    }

    return NextResponse.json(
      {
        success: true,
        url: `https://nikunj.codenex.dev/artifacts/${slug}/${filename}`,
        replaced: isUpdate,
      },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    console.error("Artifact upload failed", error);

    return NextResponse.json(
      { error: "Something went wrong while hosting this file. Please try again later." },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
