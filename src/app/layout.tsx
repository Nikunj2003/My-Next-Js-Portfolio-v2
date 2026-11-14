import type { Metadata, Viewport } from 'next'
import dynamic from 'next/dynamic'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'
import { SmoothScroll } from '@/components/SmoothScroll'
import ScrollProgress from '@/components/ScrollProgress'
import { siteConfig, ogLocale } from '@/lib/seo/site'
import { GuideCompanionMount } from '@/components/guide/GuideCompanionMount'
// The full conversation panel, on every route; it loads on first open.
import AITwinChatMount from '@/components/AITwinChatMount'
import { QuietBoundary } from '@/components/QuietBoundary'

// Mounted at the layout so every route gets the background layer, including
// /work/*. Self-gates on pointer:fine, >=1280px, and reduced motion.
const FluidCursor = dynamic(() => import('@/components/FluidCursor'))
const CommandPalette = dynamic(() => import('@/components/CommandPalette'))

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: siteConfig.title,
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.author, url: siteConfig.github }],
  creator: siteConfig.creator,
  openGraph: {
    type: 'website',
    locale: ogLocale,
    url: siteConfig.homeUrl,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.siteName,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
  },
  alternates: {
    canonical: siteConfig.homeUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  other: {
    'geo.region': siteConfig.geo.region,
    'geo.placename': siteConfig.geo.placename,
    'geo.position': siteConfig.geo.position,
    ICBM: siteConfig.geo.icbm,
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  interactiveWidget: 'resizes-content',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark light" />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <a
          href="#main-content"
          data-focus-target="true"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-full focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          Skip to content
        </a>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storedTheme = localStorage.getItem('theme');
                  var root = document.documentElement;
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var shouldUseDark = storedTheme ? storedTheme === 'dark' : prefersDark;

                  root.classList.toggle('dark', shouldUseDark);
                } catch(e) {
                  document.documentElement.classList.toggle(
                    'dark',
                    window.matchMedia('(prefers-color-scheme: dark)').matches
                  );
                }
              })();
            `,
          }}
        />
        <div id="root">
          <SmoothScroll>
            <Providers>
              <FluidCursor />
              {/* Inside SmoothScroll so it can subscribe to the Lenis instance,
                  and above {children} so every route gets the reading bar. */}
              <ScrollProgress />
              {children}
              <QuietBoundary name="AI Twin panel">
                <AITwinChatMount />
              </QuietBoundary>
              <QuietBoundary name="Guide">
                <GuideCompanionMount />
              </QuietBoundary>
              <QuietBoundary name="Command palette">
                <CommandPalette />
              </QuietBoundary>
            </Providers>
          </SmoothScroll>
        </div>
      </body>
    </html>
  )
}
