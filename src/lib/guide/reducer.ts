import {
  BORED,
  CELEBRATE,
  DEFAULT_TOOL_CUE,
  DIZZY,
  DIZZY_CLICKS,
  DIZZY_COOLDOWN_MS,
  DIZZY_MS,
  DIZZY_WINDOW_MS,
  DROWSY,
  FAILED,
  FINISHED,
  IDLE,
  LISTENING,
  NAVIGATING,
  OFFLINE,
  PET_CELEBRATE_MS,
  PET_MS,
  PET_STREAK,
  REFUSED,
  RETRYABLE_ERROR,
  SECTION_CUES,
  SEND_MS,
  SENT,
  SLEEPING,
  STREAK_RESET_MS,
  STREAMING,
  THINKING,
  TOOL_CAPTIONS,
  TOOL_CUES,
  TRANSIENT_MS,
  TYPING,
  WAKING,
} from "@/lib/guide/expressions";
import type { AvatarCue, GestureName, GuideEvent, GuideModel, GuideView, Transient } from "@/lib/guide/types";

export const initialGuideModel: GuideModel = {
  phase: "closed",
  chatOpen: false,
  touring: false,
  tool: null,
  hovering: false,
  idle: 0,
  available: true,
  tour: null,
  ambient: null,
  transient: null,
  reaction: null,
  clicks: [],
  streak: { count: 0, at: 0 },
  clickCooldownUntil: 0,
  pointAt: null,
  poke: null,
  now: 0,
};

/** Chat is doing something the visitor is waiting on. */
function isBusy(model: GuideModel) {
  return model.phase !== "closed" && model.phase !== "open";
}

/** Where the phase settles once a request ends: back to the surface that is open, or closed. */
function restingPhase(model: GuideModel) {
  return model.chatOpen ? "open" : "closed";
}

/**
 * Pure state transition for the guide.
 *
 * Returns the same object when nothing changed, so the store can skip
 * notifying React. Chat only reports phase transitions, never per token.
 */
export function reduceGuide(model: GuideModel, event: GuideEvent): GuideModel {
  switch (event.type) {
    case "tick": {
      const transientDone = model.transient && event.now >= model.transient.until;
      const reactionDone = model.reaction && event.now >= model.reaction.until;
      if (!transientDone && !reactionDone) return model;
      return {
        ...model,
        transient: transientDone ? null : model.transient,
        reaction: reactionDone ? null : model.reaction,
        now: event.now,
      };
    }
    case "chat/open": {
      // Opening mid-answer keeps the busy expression; only the surface changed.
      const phase = isBusy(model) ? model.phase : "open";
      return wake(withPoke({ ...model, chatOpen: true, phase }, "nod"));
    }
    case "chat/close": {
      // Closing mid-answer leaves the request running, so the avatar keeps showing it.
      // Typing isn't a request: closing with a draft ends it (it used to stay
      // "Listening" for good, blocking the idle ladder and click reactions).
      if (isBusy(model) && model.phase !== "typing") return wake({ ...model, chatOpen: false });
      return wake({ ...model, chatOpen: false, phase: "closed", tool: null, transient: null });
    }
    case "chat/reset": {
      if (!isBusy(model)) return model;
      return { ...model, phase: restingPhase(model), tool: null };
    }
    case "chat/typing": {
      if (model.phase !== "open" && model.phase !== "typing") return model;
      const phase = event.active ? "typing" : "open";
      return phase === model.phase ? model : wake({ ...model, phase });
    }
    case "chat/send":
      // A quick happy nod first, so sending feels acknowledged, then thinking.
      return withPoke(
        withTransient(wake({ ...model, phase: "waiting", tool: null, reaction: null }), SENT, SEND_MS),
        "nod",
      );
    case "chat/tool_call":
      return wake({ ...model, phase: "tool", tool: event.name });
    case "chat/tool_result": {
      if (event.refused) return { ...model, phase: "refused", tool: event.name };
      if (event.name === "navigate_to") return withPoke({ ...model, phase: "navigating", tool: event.name }, "nod");
      return { ...model, phase: "waiting", tool: null };
    }
    case "chat/stream_start":
      return model.phase === "streaming" ? model : { ...model, phase: "streaming", tool: null };
    case "chat/answer_end": {
      const next = withTransient({ ...model, phase: restingPhase(model), tool: null }, FINISHED, TRANSIENT_MS.finished);
      return event.grounded ? withPoke(next, "nod") : next;
    }
    case "chat/error":
      return withTransient(
        { ...model, phase: restingPhase(model), tool: null },
        event.retryable ? RETRYABLE_ERROR : FAILED,
        TRANSIENT_MS.error,
      );
    case "pet/click":
      return pet(model, event.now);
    case "page/hover":
      return event.active === model.hovering ? model : wake({ ...model, hovering: event.active });
    case "page/section": {
      const cue = SECTION_CUES[event.id] ?? null;
      return cue === model.ambient ? model : { ...model, ambient: cue };
    }
    case "page/activity":
      return model.idle > 0 ? wake(model) : model;
    case "page/idle": {
      // Never doze in the middle of something (including behind an open chat), or further than asked.
      if (model.phase !== "closed" || model.tour || event.stage <= model.idle) return model;
      return { ...model, idle: event.stage };
    }
    case "tour/start":
      return model.touring ? model : { ...model, touring: true };
    case "tour/step":
      if (!model.touring) return model;
      return wake({ ...model, tour: event.cue, pointAt: event.pointAt ?? null });
    case "tour/end": {
      if (!model.touring && !model.tour) return model;
      const next = wake({ ...model, touring: false, tour: null, pointAt: null });
      return event.completed ? withPoke(withTransient(next, CELEBRATE, TRANSIENT_MS.celebrate), "spin") : next;
    }
    case "guide/point":
      return samePoint(model.pointAt, event.pointAt) ? model : { ...model, pointAt: event.pointAt };
    case "availability":
      return event.available === model.available ? model : { ...model, available: event.available };
    default:
      return model;
  }
}

/**
 * A click on the hero avatar. Steady clicking walks through the streak; five
 * inside two seconds makes it dizzy and briefly ignores clicks. Never
 * interrupts the chat: while an answer is in flight a click only nods.
 */
function pet(model: GuideModel, now: number): GuideModel {
  const awake = wake({ ...model, now });
  if (now < model.clickCooldownUntil) return awake;
  if (isBusy(model)) return withPoke(awake, "nod");

  const clicks = [...model.clicks.filter((at) => now - at < DIZZY_WINDOW_MS), now];
  if (clicks.length >= DIZZY_CLICKS) {
    return withPoke(
      {
        ...awake,
        clicks: [],
        streak: { count: 0, at: now },
        clickCooldownUntil: now + DIZZY_COOLDOWN_MS,
        reaction: { ...DIZZY, until: now + DIZZY_MS },
      },
      "spin",
    );
  }

  const continuing = now - model.streak.at < STREAK_RESET_MS;
  const count = continuing ? model.streak.count + 1 : 1;
  const cue = PET_STREAK[(count - 1) % PET_STREAK.length];
  const last = cue === PET_STREAK[PET_STREAK.length - 1];
  return withPoke(
    {
      ...awake,
      clicks,
      streak: { count, at: now },
      reaction: { ...cue, until: now + (last ? PET_CELEBRATE_MS : PET_MS) },
    },
    last ? "spin" : "bounce",
  );
}

function wake(model: GuideModel): GuideModel {
  if (model.idle === 0) return model;
  const next = { ...model, idle: 0 as const };
  // Only a real doze gets the waking animation; boredom just snaps out of it.
  return model.idle >= 2 ? withTransient(next, WAKING, TRANSIENT_MS.waking) : next;
}

function withTransient(model: GuideModel, cue: AvatarCue, ms: number): GuideModel {
  const transient: Transient = { ...cue, until: model.now + ms };
  return { ...model, transient };
}

function withPoke(model: GuideModel, kind: GestureName): GuideModel {
  return { ...model, poke: { kind, nonce: (model.poke?.nonce ?? 0) + 1 } };
}

function samePoint(a: GuideModel["pointAt"], b: GuideModel["pointAt"]) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y;
}

/**
 * Picks what the avatar shows. Higher layers win:
 * transient → chat activity → reaction → tour → hover/open → offline → idle ladder → ambient → idle.
 */
export function selectGuideView(model: GuideModel): GuideView {
  const base = { pointAt: model.pointAt, poke: model.poke };
  const view = (cue: AvatarCue, caption: string): GuideView => ({ ...base, state: cue.state, face: cue.face, caption });

  if (model.transient) {
    return view(model.transient, captionForTransient(model.transient.state));
  }

  switch (model.phase) {
    case "waiting":
      return view(THINKING, "Thinking");
    case "tool": {
      const name = model.tool ?? "";
      return view(TOOL_CUES[name] ?? DEFAULT_TOOL_CUE, TOOL_CAPTIONS[name] ?? "Working on it");
    }
    case "refused":
      return view(REFUSED, "That isn't something Nikunj has measured");
    case "navigating":
      return view(NAVIGATING, TOOL_CAPTIONS.navigate_to);
    case "streaming":
      return view(STREAMING, "Answering");
    case "typing":
      return view(TYPING, "Listening");
    default:
      break;
  }

  if (model.reaction) return view(model.reaction, "Having fun");
  if (model.tour) return view(model.tour, "Guided tour");
  if (model.phase === "open" || model.hovering) return view(LISTENING, "Ready to help");
  if (!model.available) return view(OFFLINE, "Assistant offline");
  if (model.idle === 3) return view(SLEEPING, "Resting");
  if (model.idle === 2) return view(DROWSY, "Getting sleepy");
  if (model.idle === 1) return view(BORED, "Ready to help");
  if (model.ambient) return view(model.ambient, "Ready to help");
  return view(IDLE, "Ready to help");
}

function captionForTransient(state: string) {
  switch (state) {
    case "finished":
      return "Answer ready";
    case "failed":
      return "Something went wrong";
    case "confused":
      return "Hit a snag. You can retry";
    case "celebrate":
      return "Tour complete";
    case "happy":
      return "Got it";
    default:
      return "Ready to help";
  }
}
