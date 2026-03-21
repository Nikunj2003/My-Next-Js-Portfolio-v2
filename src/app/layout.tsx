import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Outfit } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'

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
  metadataBase: new URL('https://nikunj-khitha.vercel.app'),
  title: 'Nikunj Khitha — GenAI Platform Engineer',
  description: 'Software Engineer specializing in productionizing Generative AI — GraphRAG engines, multi-agent orchestration, MCP-based automation, and AI infrastructure.',
  keywords: ['GenAI', 'Platform Engineer', 'GraphRAG', 'Multi-Agent System', 'Software Engineer', 'Nikunj Khitha', 'MCP', 'LangChain', 'FastAPI'],
  authors: [{ name: 'Nikunj Khitha', url: 'https://github.com/Nikunj2003' }],
  creator: 'Nikunj Khitha',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    title: 'Nikunj Khitha — GenAI Platform Engineer',
    description: 'I productionize Generative AI — building GraphRAG engines, platform agents, AI gateways, and MCP-based automations for enterprise environments.',
    siteName: 'Nikunj Khitha Portfolio',
    images: [{
      url: '/Nikunj_Resume.pdf',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nikunj Khitha — GenAI Platform Engineer',
    description: 'Software Engineer specializing in productionizing Generative AI.',
  },
  alternates: {
    canonical: '/',
  },
  other: {
    'geo.region': 'IN-HR',
    'geo.placename': 'Gurugram',
    'geo.position': '28.4595;77.0266',
    'ICBM': '28.4595, 77.0266',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
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
      <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans`} suppressHydrationWarning>
        {/* Must be first in body — runs synchronously before any paint */}
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
          <Providers>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  )
}
