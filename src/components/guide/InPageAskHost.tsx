"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import { AskContent } from "@/components/guide/AskContent";
import { useIsMobile } from "@/hooks/use-mobile";
import { hostDomId, hostSection, type AskHost } from "@/lib/guide/ask-hosts";
import { dispatchCompanion, openPanel, takeAskOpener, useCompanionSelector } from "@/lib/guide/companion-store";
import { NAVBAR_CLEARANCE } from "@/lib/scroll";

type Lenis = { scrollTo: (y: number, options?: object) => void };

/**
 * What every in-page host (the hero, the footer, a section's dock) does the
 * same way, so they behave as one:
 *  - it is open when the conversation is open here (`askHost`), never on phones;
 *  - it remembers what opened it and gives focus back there on close;
 *  - Escape closes it (the companion leaves in-page hosts to their owner);
 *  - once laid out, it is brought into view with one scroll, never per token.
 */
export function useInPageHost(host: AskHost, options: { fallbackFocus?: () => HTMLElement | null } = {}) {
  const isMobile = useIsMobile();
  const reduceMotion = Boolean(useReducedMotion());
  const openHere = useCompanionSelector((s) => s.bubble === "ask" && s.askHost === host);
  const open = openHere && !isMobile;
  const openerRef = useRef<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const { fallbackFocus } = options;

  useEffect(() => {
    if (!open) return;
    openerRef.current = takeAskOpener();
    const element = hostRef.current;
    if (!element) return;
    // One reveal at a time; each waits for the layout to settle first.
    let stop: (() => void) | null = null;
    const reveal = () => {
      stop = revealWhenSettled(() => hostRef.current, reduceMotion, () => {
        stop = null;
      });
    };
    reveal();
    // The conversation grows after it opens: the first question adds the
    // answer area, and the chips come back when an answer ends. Nothing
    // scrolled for that, so the composer and the answer slid below the
    // screen. When it grows while its bottom (the composer) was in view, it
    // is brought back into view the same way, once the layout has settled.
    // Streaming text never resizes it (the answer scrolls inside a fixed
    // area), so this never follows tokens; and a reader who has scrolled the
    // composer out of view is left where they are.
    // "In view" is read from the page as it was just before it grew: the
    // composer's place in the document then, against the scroll now. A reader
    // who scrolled the conversation away mid-answer is never pulled back to it.
    const docBottom = () => element.getBoundingClientRect().bottom + window.scrollY;
    let lastHeight = element.getBoundingClientRect().height;
    let lastBottom = docBottom();
    const observer = new ResizeObserver(() => {
      const box = element.getBoundingClientRect();
      const grew = box.height > lastHeight + 1;
      const wasBottom = lastBottom - window.scrollY;
      lastHeight = box.height;
      lastBottom = docBottom();
      if (!grew || stop) return;
      const wasInView = wasBottom > NAVBAR_CLEARANCE && wasBottom <= window.innerHeight + 2;
      if (!wasInView) return;
      reveal();
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      stop?.();
    };
  }, [open, reduceMotion]);

  const close = useCallback(() => {
    dispatchCompanion({ type: "ask/close" });
    const opener = openerRef.current;
    (opener?.isConnected ? opener : fallbackFocus?.())?.focus({ preventScroll: true });
  }, [fallbackFocus]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return { open, close, hostRef, reduceMotion };
}

/**
 * Brings a host that has just opened into view, once its layout has settled.
 *
 * Opening one host often closes another (the conversation moves from Work to
 * Contact, or from a section row to the header), and those animate their
 * height for a few hundred ms. Measuring at a fixed delay read a page that was
 * still moving: a row collapsing ABOVE the new one then pulled the page up by
 * its height after the scroll was aimed, so the scroll overshot by that much.
 *
 * So it waits until the host's place in the page and its size have held still
 * (the browser's scroll anchoring keeps the reader's place while content above
 * collapses; correcting for it as well doubled the shift), and only then does
 * one eased scroll, measured from that settled layout, bring it fully into view (below the navbar, its bottom above the screen's edge;
 * its top wins when it is taller than the screen). The visitor scrolling
 * themselves cancels it.
 */
function revealWhenSettled(node: () => HTMLElement | null, reduceMotion: boolean, onDone?: () => void) {
  const lenis = () => (window as Window & { __lenis?: Lenis }).__lenis;
  const start = performance.now();
  let frame = 0;
  let still = 0;
  let last: { docTop: number; height: number } | null = null;
  let cancelled = false;
  // The visitor scrolling the page themselves takes over. Keys only when they
  // scroll it (Enter sends the question, which is what grows the host).
  const cancel = () => finish();
  const SCROLL_KEYS = new Set(["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", " "]);
  const cancelKey = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, [contenteditable=true]")) return;
    if (SCROLL_KEYS.has(event.key)) finish();
  };
  const finish = () => {
    if (cancelled) return;
    cancelled = true;
    detach();
    onDone?.();
  };
  const step = () => {
    if (cancelled) return;
    const element = node();
    if (!element) return finish();
    const box = element.getBoundingClientRect();
    const docTop = box.top + window.scrollY;
    // Still once its place in the page and its size have held for a few frames.
    if (last) still = Math.abs(docTop - last.docTop) < 0.5 && Math.abs(box.height - last.height) < 0.5 ? still + 1 : 0;
    last = { docTop, height: box.height };
    const elapsed = performance.now() - start;
    if ((still >= 4 && elapsed > 120) || elapsed > 1600) {
      const settled = element.getBoundingClientRect();
      const top = NAVBAR_CLEARANCE + 12;
      const bottom = window.innerHeight - 24;
      let by = 0;
      if (settled.top < top || settled.height > bottom - top) by = settled.top - top;
      else if (settled.bottom > bottom) by = settled.bottom - bottom;
      if (Math.abs(by) >= 1) {
        const instance = lenis();
        if (instance) instance.scrollTo(window.scrollY + by, { duration: reduceMotion ? 0 : 0.6 });
        else window.scrollTo({ top: window.scrollY + by, behavior: reduceMotion ? "auto" : "smooth" });
      }
      return finish();
    }
    frame = requestAnimationFrame(step);
  };
  const detach = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("keydown", cancelKey);
  };
  frame = requestAnimationFrame(step);
  window.addEventListener("wheel", cancel, { passive: true });
  window.addEventListener("touchstart", cancel, { passive: true });
  window.addEventListener("keydown", cancelKey);
  return () => {
    cancelled = true;
    detach();
  };
}

/** The conversation itself, as an in-page host shows it: one labelled region. */
export function HostConversation({ host, close, reduceMotion, fill = false, className = "", initial, context, bodyHeight, socket = false }: {
  host: AskHost;
  /** Reserve a place for Nex at the head of the conversation (`data-guide-ask-socket`). */
  socket?: boolean;
  bodyHeight?: string;
  /** What the chips and links are for (`SECTION_CHIPS` key); by default the host's section. */
  context?: string;
  close: () => void;
  reduceMotion: boolean;
  fill?: boolean;
  className?: string;
  initial?: TargetAndTransition;
}) {
  return (
    <motion.div
      key="ask"
      id={hostDomId(host)}
      data-nex-host-live
      role="region"
      aria-label="Conversation with Nex"
      initial={reduceMotion ? { opacity: 0 } : initial ?? { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.26, ease: [0.22, 1, 0.36, 1] }}
      className={"flex w-full flex-col overflow-hidden rounded-2xl border border-primary/20 text-left glass-strong shadow-accent-soft " + className}
    >
      <AskContent inline fill={fill} activeSection={context ?? hostSection(host) ?? (host === "footer" ? "contact" : "hero")} onExpand={openPanel} onClose={close} isMobile={false} reduceMotion={reduceMotion} bodyHeight={bodyHeight} socket={socket} />
    </motion.div>
  );
}

/**
 * The answer area in a full-width row: room for a real answer (cards, tool
 * calls) while the question, chips and composer still fit one screen.
 */
const ROW_BODY = "clamp(14rem, calc(100svh - 26rem), 30rem)";

/** An element whose height follows its content with an eased transition, so what is below slides. */
function useMeasuredHeight() {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const measure = () => setHeight(Math.ceil(inner.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);
  return { innerRef, height };
}

/**
 * A section's host inside its sticky intro panel (About, Experience, Skills):
 * the panel's body, or, once the visitor asks here, the conversation in its
 * place. The panel stays pinned and the column beside it never moves; the
 * conversation's height is set from the screen so the pinned panel fits it.
 */
export function PanelAskSwap({ section, children }: { section: "about" | "experience" | "skills"; children: ReactNode }) {
  const host = `section:${section}` as const;
  const { open, close, hostRef, reduceMotion } = useInPageHost(host);
  const { innerRef, height } = useMeasuredHeight();
  // The conversation takes the body's own height, so opening it doesn't
  // resize the pinned panel (at least 20rem to be usable, and never taller
  // than the screen below the panel's pinned top allows).
  const bodyHeight = useRef(0);
  const [convoHeight, setConvoHeight] = useState(320);
  useLayoutEffect(() => {
    if (open || typeof height !== "number") return;
    bodyHeight.current = height;
  }, [height, open]);
  useLayoutEffect(() => {
    if (!open) return;
    const top = hostRef.current?.getBoundingClientRect().top ?? 0;
    const panel = hostRef.current?.closest("[data-guide-panel]")?.getBoundingClientRect().top ?? top;
    // The panel pins at 8rem; what is above the body inside it stays.
    const room = window.innerHeight - 128 - (top - panel) - 48;
    setConvoHeight(Math.round(Math.min(Math.max(bodyHeight.current, 320), Math.max(320, room))));
  }, [hostRef, open]);
  return (
    <motion.div
      ref={hostRef}
      data-nex-host={host}
      initial={false}
      animate={{ height }}
      transition={{ duration: reduceMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
      style={{ overflow: open ? "hidden" : "visible" }}
    >
      <div ref={innerRef}>
        <AnimatePresence initial={false} mode="popLayout">
          {open ? (
            <div key="ask" className="flex" style={{ height: convoHeight }}>
              <HostConversation host={host} close={close} reduceMotion={reduceMotion} fill />
            </div>
          ) : (
            <motion.div key="body" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * A section's answer row (Work, Nex, Contact): nothing until the visitor asks
 * here, then a full-width row in the flow, outside any card or grid. Its
 * height is reserved once when it opens; the answer scrolls inside it.
 */
export function SectionAskRow({ section, className = "" }: { section: "work" | "nex" | "contact"; className?: string }) {
  const host = `section:${section}` as const;
  const { open, close, hostRef, reduceMotion } = useInPageHost(host);
  const { innerRef, height } = useMeasuredHeight();
  return (
    <motion.div
      ref={hostRef}
      data-nex-host={host}
      initial={false}
      animate={{ height }}
      transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
      // Laid out even while closed (zero height), so the host counts as on the page.
      className={"w-full overflow-hidden " + className}
    >
      <div ref={innerRef} className={open ? "pb-8 pt-2" : ""}>
        <AnimatePresence initial={false}>
          {open && <HostConversation host={host} close={close} reduceMotion={reduceMotion} bodyHeight={ROW_BODY} socket initial={{ opacity: 0, y: -8 }} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * A row in another page's flow (`/work`, a case study): nothing until the
 * visitor asks here, then the conversation, full width in the reading column,
 * under a small label naming what it is about. Outside any card or grid.
 */
export function PageAskRow({ id, label, context, className = "" }: { id: string; label?: string; context: "work-index" | "case-study"; className?: string }) {
  const host = `page:${id}` as const;
  const { open, close, hostRef, reduceMotion } = useInPageHost(host);
  const { innerRef, height } = useMeasuredHeight();
  return (
    <motion.div
      ref={hostRef}
      data-nex-host={host}
      initial={false}
      animate={{ height }}
      transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={"w-full overflow-hidden " + className}
    >
      <div ref={innerRef} className={open ? "pb-6 pt-4" : ""}>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div key="row" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0.1 : 0.26 }}>
              {label && <p className="mb-2 text-xs text-muted-foreground">Nex, on <span className="font-semibold text-foreground/85">{label}</span></p>}
              <HostConversation host={host} close={close} reduceMotion={reduceMotion} context={context} bodyHeight={ROW_BODY} socket />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * A page box that is also its page's conversation (the "Not sure where to
 * start?" box on `/work`): its own body (input, examples), or, once the
 * visitor asks, the conversation in its place, at the box's full width. One
 * conversation on the page, never a second input beside it.
 */
export function PageAskSwap({ id, context, children }: { id: string; context: "work-index" | "case-study"; children: ReactNode }) {
  const host = `page:${id}` as const;
  const { open, close, hostRef, reduceMotion } = useInPageHost(host);
  const { innerRef, height } = useMeasuredHeight();
  return (
    <motion.div
      ref={hostRef}
      data-nex-host={host}
      initial={false}
      animate={{ height }}
      transition={{ duration: reduceMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
      style={{ overflow: open ? "hidden" : "visible" }}
    >
      <div ref={innerRef}>
        <AnimatePresence initial={false} mode="popLayout">
          {open ? (
            <HostConversation key="ask" host={host} close={close} reduceMotion={reduceMotion} context={context} bodyHeight={ROW_BODY} socket className="mt-4" />
          ) : (
            <motion.div key="body" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
