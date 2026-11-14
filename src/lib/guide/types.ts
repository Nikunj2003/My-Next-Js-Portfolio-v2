/**
 * Types for the portfolio guide: the animated avatar that mirrors what the AI
 * Twin is doing, reacts to the visitor, and walks them through the site.
 *
 * Erasable TypeScript only (no enums), so `node --test --experimental-strip-types`
 * can run the reducer tests directly.
 */

export type GestureName = "nod" | "bounce" | "spin";

/** What the chat is doing right now, as far as the avatar is concerned. */
export type ChatPhase =
  | "closed"
  | "open"
  | "typing"
  | "waiting"
  | "tool"
  | "streaming"
  | "refused"
  | "navigating";

/** A point on screen, in viewport pixels. Each avatar converts it to its own gaze. */
export type ViewportPoint = { x: number; y: number };

/** Idle ladder: 0 awake, 1 bored, 2 drowsy, 3 asleep. */
export type IdleStage = 0 | 1 | 2 | 3;

export type GuideEvent =
  | { type: "chat/open" }
  | { type: "chat/close" }
  | { type: "chat/typing"; active: boolean }
  | { type: "chat/send" }
  | { type: "chat/tool_call"; name: string }
  | { type: "chat/tool_result"; name: string; refused: boolean }
  | { type: "chat/stream_start" }
  | { type: "chat/answer_end"; grounded: boolean }
  | { type: "chat/error"; retryable: boolean }
  | { type: "page/hover"; active: boolean }
  | { type: "page/section"; id: string }
  | { type: "page/activity" }
  | { type: "page/idle"; stage: IdleStage }
  /** The visitor clicked the hero avatar. `now` makes streak timing testable. */
  | { type: "pet/click"; now: number }
  | { type: "tour/step"; cue: AvatarCue; pointAt?: ViewportPoint | null }
  | { type: "tour/end"; completed: boolean }
  | { type: "guide/point"; pointAt: ViewportPoint | null }
  | { type: "availability"; available: boolean }
  | { type: "tick"; now: number };

export type AvatarCue = { state: string; face?: string };

/** A short-lived expression that wins over everything else until it expires. */
export type Transient = AvatarCue & { until: number };

export type GuideModel = {
  phase: ChatPhase;
  /** Name of the tool currently running, for the tool → expression mapping. */
  tool: string | null;
  hovering: boolean;
  idle: IdleStage;
  available: boolean;
  tour: AvatarCue | null;
  ambient: AvatarCue | null;
  transient: Transient | null;
  /** A playful reaction to being clicked. Below chat activity, above everything else. */
  reaction: Transient | null;
  /** Recent click times, for dizzy detection. */
  clicks: number[];
  streak: { count: number; at: number };
  /** Clicks are ignored until this time (after a dizzy spell). */
  clickCooldownUntil: number;
  /** Something every avatar should look at, such as a tour target or the composer. */
  pointAt: ViewportPoint | null;
  /** Increments each time a gesture should play; the avatar pokes on change. */
  poke: { kind: GestureName; nonce: number } | null;
  /** Current time as last reported by an event, for transient expiry. */
  now: number;
};

/** What the avatar component renders. Derived from the model. */
export type GuideView = {
  state: string;
  face?: string;
  pointAt: ViewportPoint | null;
  poke: GuideModel["poke"];
  /** Plain-language description of what the guide is doing, for screen readers and captions. */
  caption: string;
};
