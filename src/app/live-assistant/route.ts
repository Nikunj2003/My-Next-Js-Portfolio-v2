/*
 * Next reads route segment config only from literal exports in the route file
 * itself; a bare re-export silently drops `runtime` and `maxDuration`, which
 * left this public path (the one the chat client actually calls) on the
 * platform's default timeout.
 */
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export { GET, POST } from "../api/chat/route";
