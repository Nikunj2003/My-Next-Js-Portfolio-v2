"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Something went wrong</h1>
        <p className="mb-6 text-xl text-muted-foreground">This page hit an unexpected error.</p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button type="button" onClick={reset} className="btn-cta-primary">
            Try again
          </button>
          <Link href="/" className="text-primary-text underline hover:text-primary-text/90">
            Return to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
