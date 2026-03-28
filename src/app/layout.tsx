import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Outfit } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'
import { SmoothScroll } from '@/components/SmoothScroll'
import { getPortfolioGraph, toJsonLd } from '@/lib/seo/jsonld'
import { siteConfig } from '@/lib/seo/site'
const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800']
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600', '700']
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: siteConfig.title,
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.author, url: siteConfig.github }],
  creator: siteConfig.creator,
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.homeUrl,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.siteName,
    images: [
      {
        url: siteConfig.ogImage,
        alt: siteConfig.title,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const portfolioJsonLd = toJsonLd(getPortfolioGraph()).replace(/</g, '\\u003c')

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark light" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: portfolioJsonLd }}
        />
      </head>
      <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans`} suppressHydrationWarning>
        <a
          href="#main-content"
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
                  var theme = localStorage.getItem('theme');
                  var root = document.documentElement;
                  if (theme === 'light') {
                    root.classList.remove('dark');
                  } else {
                    root.classList.add('dark');
                  }
                } catch(e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
        <div id="root">
          <SmoothScroll>
            <Providers>
              {children}
            </Providers>
          </SmoothScroll>
        </div>
      </body>
    </html>
  )
}
