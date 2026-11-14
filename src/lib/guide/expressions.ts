import type { AvatarCue } from "@/lib/guide/types";

/**
 * The guide's expression vocabulary.
 *
 * Persona: calm, precise, quietly confident. Excitement is rationed to the
 * greeting and the end of the tour, so it still means something when it shows.
 * Every state here exists in the @bible-strong/avatar-core catalogue.
 */

export const IDLE: AvatarCue = { state: "idle", face: "calm" };
export const LISTENING: AvatarCue = { state: "listening", face: "happy" };
export const TYPING: AvatarCue = { state: "listening", face: "calm" };
export const THINKING: AvatarCue = { state: "thinking" };
export const STREAMING: AvatarCue = { state: "streaming", face: "calm" };
export const REFUSED: AvatarCue = { state: "confused", face: "confused" };
export const NAVIGATING: AvatarCue = { state: "proud", face: "happy" };
export const FINISHED: AvatarCue = { state: "finished", face: "happy" };
export const RETRYABLE_ERROR: AvatarCue = { state: "confused", face: "confused" };
export const FAILED: AvatarCue = { state: "failed", face: "sad" };
export const OFFLINE: AvatarCue = { state: "sleeping", face: "sleepy" };
export const SLEEPING: AvatarCue = { state: "sleeping", face: "sleepy" };
export const WAKING: AvatarCue = { state: "waking", face: "happy" };
export const CELEBRATE: AvatarCue = { state: "celebrate", face: "happy" };

/** Each portfolio tool gets the catalogue state that best reads as that kind of work. */
export const TOOL_CUES: Record<string, AvatarCue> = {
  search_work: { state: "searching", face: "inspecting" },
  get_case_study: { state: "reading", face: "inspecting" },
  get_metric: { state: "working", face: "squinted" },
  compare_systems: { state: "coding", face: "inspecting" },
  navigate_to: NAVIGATING,
};

export const DEFAULT_TOOL_CUE: AvatarCue = { state: "working", face: "inspecting" };

/** Plain-language captions, so meaning never depends on the animation alone. */
export const TOOL_CAPTIONS: Record<string, string> = {
  search_work: "Searching Nikunj's work",
  get_case_study: "Reading a case study",
  get_metric: "Checking a measured result",
  compare_systems: "Comparing two systems",
  navigate_to: "Taking you there",
};

/** Ambient cues when a section comes into view and nothing else is happening. */
export const SECTION_CUES: Record<string, AvatarCue> = {
  work: { state: "curious", face: "happy" },
  experience: { state: "reading", face: "calm" },
  skills: { state: "curious", face: "calm" },
  contact: { state: "happy", face: "happy" },
};

/** How long one-off expressions hold before handing back to the layers below. */
export const TRANSIENT_MS = {
  finished: 1800,
  error: 3200,
  celebrate: 2600,
  waking: 1600,
};

/** Idle ladder: bored, then drowsy, then asleep, measured from the last input. */
export const IDLE_LADDER_MS = [18_000, 40_000, 60_000] as const;
export const BORED: AvatarCue = { state: "bored", face: "sleepy" };
export const DROWSY: AvatarCue = { state: "drowsy", face: "sleepy" };

/** A quick happy beat when the visitor sends a message, before thinking. */
export const SENT: AvatarCue = { state: "happy", face: "happy" };
export const SEND_MS = 700;

/**
 * Clicking the hero avatar plays these in turn. Each click moves one step on;
 * a pause of STREAK_RESET_MS starts over. The last one spins.
 */
export const PET_STREAK: AvatarCue[] = [
  { state: "playful", face: "happy" },
  { state: "laughing", face: "happy" },
  { state: "excited", face: "happy" },
  { state: "proud", face: "happy" },
  { state: "shy", face: "calm" },
  { state: "celebrate", face: "happy" },
];
export const PET_MS = 1800;
export const PET_CELEBRATE_MS = 2200;
export const STREAK_RESET_MS = 4000;

/** Five clicks inside two seconds is too much: the guide gets dizzy. */
export const DIZZY: AvatarCue = { state: "confused", face: "surprised" };
export const DIZZY_CLICKS = 5;
export const DIZZY_WINDOW_MS = 2000;
export const DIZZY_MS = 2200;
export const DIZZY_COOLDOWN_MS = 1000;
