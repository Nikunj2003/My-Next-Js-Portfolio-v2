import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

/**
 * A note from Nex beside the block it annotates: how a figure was measured,
 * why an alternative was turned down. Written ahead of time from the case
 * study's own data, so it costs no model call and is in the server HTML.
 *
 * Wide screens: the block and its note sit side by side, the note in a rail
 * to the right (`xl:`). Narrower: the note folds under the block as a
 * disclosure, closed by default so the prose reads straight through.
 */
export function Annotated({ children, note }: { children: ReactNode; note: ReactNode | null }) {
  if (!note) return <>{children}</>;
  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-6">
      <div className="min-w-0">{children}</div>
      {note}
    </div>
  );
}

export function MarginNote({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside aria-label={`Nex: ${label}`} className="mt-3 xl:mt-1">
      <details className="group xl:hidden">
        <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-primary-text hover:text-primary">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          {label}
        </summary>
        <div className="mt-2 border-l-2 border-primary/25 pl-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </details>
      <div className="hidden border-l-2 border-primary/25 pl-3 xl:block">
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary-text">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          {label}
        </p>
        <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </aside>
  );
}
