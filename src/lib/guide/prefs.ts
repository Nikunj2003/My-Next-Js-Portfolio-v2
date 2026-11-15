/**
 * The guide's per-visitor preferences. Stored on this device only, and parsed
 * defensively: storage can be blocked, cleared, or hold an older shape.
 */
export const GUIDE_PREFS_KEY = "nikunj-guide-v1";

export type GuidePrefs = {
  tourDone: boolean;
  /** Tips stay off for good once the visitor says so. */
  tipsMuted: boolean;
  celebrated: boolean;
};

const DEFAULTS: GuidePrefs = { tourDone: false, tipsMuted: false, celebrated: false };

export function readGuidePrefs(): GuidePrefs {
  try {
    const raw = window.localStorage.getItem(GUIDE_PREFS_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<GuidePrefs> | null;
    if (!parsed || typeof parsed !== "object") return DEFAULTS;
    return {
      tourDone: parsed.tourDone === true,
      tipsMuted: parsed.tipsMuted === true,
      celebrated: parsed.celebrated === true,
    };
  } catch {
    return DEFAULTS;
  }
}

export function writeGuidePrefs(changes: Partial<GuidePrefs>) {
  try {
    window.localStorage.setItem(GUIDE_PREFS_KEY, JSON.stringify({ ...readGuidePrefs(), ...changes }));
  } catch {
    // Storage is a convenience here; the guide works without it.
  }
}
