import type { ViewportPoint } from "@/lib/guide/types";

/**
 * The gaze an avatar at `from` needs to look at `to`, as the avatar library's
 * `lookAt`: -1..1, right and up. Distances are scaled by half the viewport so a
 * target across the screen turns the head fully, and nearby ones only a little.
 */
export function lookToward(from: ViewportPoint, to: ViewportPoint, viewportWidth: number, viewportHeight: number): readonly [number, number] {
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  const x = clamp((to.x - from.x) / Math.max(1, viewportWidth / 2));
  const y = clamp(-(to.y - from.y) / Math.max(1, viewportHeight / 2));
  return [round(x), round(y)];
}

function round(value: number) {
  return Math.round(value * 100) / 100 + 0;
}
