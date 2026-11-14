"use client";

import { Component, type ReactNode } from "react";

/**
 * Wraps an optional overlay (the chat panel, the guide, the command palette)
 * so a failure in it removes just that overlay. These live in the root
 * layout, outside `error.tsx`, so an uncaught error there used to replace the
 * whole site with the global error page.
 */
export class QuietBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`${this.props.name} failed and was hidden:`, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
