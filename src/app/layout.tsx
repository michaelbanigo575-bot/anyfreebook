import type { Metadata } from 'next';
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
import { Analytics } from '@vercel/analytics/react';
import { websiteSchema, organizationSchema } from '@/lib/schema';

export const metadata: Metadata = {
  title: {
    default: 'ANYFREEBOOK — 1,700,000+ Free Books, Audiobooks & Textbooks',
    template: '%s | ANYFREEBOOK',
  },
  description: "The world's largest free book aggregator. 1,700,000+ free books, audiobooks, comics, and magazines across 500+ professions. Download PDF, EPUB, and more — 100% free and legal.",
  keywords: ['free books', 'free textbooks', 'free ebooks', 'free audiobooks', 'free PDF books', 'download free books', 'open access books', 'free college textbooks'],
  authors: [{ name: 'ANYFREEBOOK' }],
  creator: 'ANYFREEBOOK',
  metadataBase: new URL('https://anyfreebook.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://anyfreebook.com',
    siteName: 'ANYFREEBOOK',
    title: 'ANYFREEBOOK — 1,700,000+ Free Books, Audiobooks & Textbooks',
    description: "The world's largest free book aggregator. Download free books across 500+ professions.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ANYFREEBOOK — Free Books for Every Profession' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ANYFREEBOOK — 1,700,000+ Free Books',
    description: "The world's largest free book aggregator.",
    images: ['/og-image.png'],
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
        <link rel="apple-touch-icon" href="/icon-192.png" />
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
