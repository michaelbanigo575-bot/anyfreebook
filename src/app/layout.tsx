import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { AudioProvider, AudioPlayerBar } from '@/components/AudioPlayer';
import { ThemeProvider } from '@/components/ThemeProvider';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { ErrorMonitor } from '@/components/ErrorMonitor';
import { ReadingReminderProvider } from '@/components/ReadingReminderProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { BackButton } from '@/components/BackButton';
import { PublicOnly } from '@/components/PublicChrome';
import { themeBootstrapScript } from '@/lib/themes';
import { preferencesBootstrapScript } from '@/lib/preferences';
import { Analytics } from '@vercel/analytics/react';
import { websiteSchema, organizationSchema } from '@/lib/schema';
import { CATALOGUE } from '@/lib/catalogueStats';

export const metadata: Metadata = {
  title: {
    default: `ANYFREEBOOK — ${CATALOGUE.liveBooksShort} Free Books & Live Open-Access Results`,
    template: '%s | ANYFREEBOOK',
  },
  description: `A free book aggregator. ${CATALOGUE.liveBooks} free books and papers from ${CATALOGUE.fields} fields, searched live across ${CATALOGUE.sources} open-access sources. Download PDF, EPUB, and more — verified free and legal.`,
  keywords: ['free books', 'free textbooks', 'free ebooks', 'free audiobooks', 'free PDF books', 'download free books', 'open access books', 'free college textbooks'],
  authors: [{ name: 'ANYFREEBOOK' }],
  creator: 'ANYFREEBOOK',
  metadataBase: new URL('https://anyfreebook.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://anyfreebook.com',
    siteName: 'ANYFREEBOOK',
    title: `ANYFREEBOOK — ${CATALOGUE.liveBooksShort} Free Books & Live Open-Access Results`,
    description: `A free book aggregator. Download free books across ${CATALOGUE.categories} categories.`,
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'ANYFREEBOOK — Free Books for Every Profession' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `ANYFREEBOOK — ${CATALOGUE.liveBooksShort} Free Books`,
    description: "A free book aggregator.",
    images: ['/api/og'],
    creator: '@anyfreebook',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    types: { 'application/rss+xml': 'https://anyfreebook.com/feed.xml' },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemas = [websiteSchema(), organizationSchema()];

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ANYFREEBOOK" />
        {/* Webfonts: a <link> in the head, not an @import inside the stylesheet.
            An @import after other rules is invalid CSS and browsers drop it —
            the site was silently rendering in system fonts. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        )}
        {schemas.map((schema, i) => (
          <script
            key={`schema-${i}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        {/* Applies the saved theme before the first paint. Without it the page
            paints with the light :root defaults and then repaints dark once
            ThemeProvider hydrates — a white flash on every load. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript() }} />
        {/* Applies the saved appearance preferences (font size, animations) before
            the first paint, so the page never renders at the wrong size and jumps. */}
        <script dangerouslySetInnerHTML={{ __html: preferencesBootstrapScript() }} />
        <AuthProvider>
          <ThemeProvider>
            <AudioProvider>
              <Navbar />
              <main className="flex-1">
                <PublicOnly><BackButton /></PublicOnly>
                {children}
              </main>
              <PublicOnly><AudioPlayerBar /></PublicOnly>
              <PublicOnly><PWAInstallPrompt /></PublicOnly>
              <ErrorMonitor />
              <PublicOnly><ReadingReminderProvider /></PublicOnly>
              <PublicOnly><Footer /></PublicOnly>
            </AudioProvider>
          </ThemeProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
