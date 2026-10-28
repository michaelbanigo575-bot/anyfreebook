import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GUIDES, getGuide } from '@/lib/guides';
import { breadcrumbSchema } from '@/lib/schema';
import { primaryButtonClass } from '@/lib/ui';

export function generateStaticParams() {
  return GUIDES.map(guide => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: 'Guide not found — ANYFREEBOOK' };

  return {
    title: `${guide.title} — Free PDF Guide | ANYFREEBOOK`,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: 'article',
      url: `https://anyfreebook.com/guides/${guide.slug}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(guide.title)}&subtitle=${encodeURIComponent(
            guide.subtitle
          )}&type=book`,
          width: 1200,
          height: 630,
          alt: guide.title,
        },
      ],
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: guide.title,
    description: guide.description,
    author: { '@type': 'Organization', name: 'ANYFREEBOOK' },
    publisher: { '@type': 'Organization', name: 'ANYFREEBOOK' },
    inLanguage: 'en',
    keywords: guide.keywords.join(', '),
    isAccessibleForFree: true,
    url: `https://anyfreebook.com/guides/${guide.slug}`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    hasPart: guide.sections.map(section => ({
      '@type': 'Chapter',
      name: section.title,
      url: `https://anyfreebook.com/guides/${guide.slug}#${section.anchor}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Guides', path: '/guides' },
              { name: guide.title, path: `/guides/${guide.slug}` },
            ])
          ),
        }}
      />

      <article className="content-wrapper py-8">
        <nav className="text-sm text-[var(--text-muted)] mb-5">
          <Link href="/guides" className="hover:underline">
            ← All guides
          </Link>
        </nav>

        <header
          className="rounded-2xl p-7 mb-8 text-white"
          style={{ background: `linear-gradient(135deg, ${guide.accent}, ${guide.accent}cc)` }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest opacity-90 mb-3">
            {guide.audience} · Free PDF guide
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold leading-tight mb-3">
            {guide.title}
          </h1>
          <p className="text-base opacity-95 leading-relaxed mb-5">{guide.subtitle}</p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/guides/${guide.slug}.pdf`}
              download
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-[var(--radius-lg)] font-semibold text-sm hover:opacity-90 transition-all no-underline"
              style={{ color: guide.accent }}
            >
              ⬇ Download the PDF
            </a>
            <span className="text-xs opacity-90">
              {guide.sections.length} sections · free to print and share
            </span>
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr_260px] gap-10">
          <div
            className="guide-body"
            dangerouslySetInnerHTML={{ __html: guide.bodyHtml }}
          />

          <aside className="lg:sticky lg:top-24 self-start">
            <nav className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">
                Contents
              </h2>
              <ol className="space-y-1.5 text-sm">
                {guide.sections.map((section, index) => (
                  <li key={section.anchor} className="flex gap-2">
                    <span className="text-[var(--primary)] font-semibold tabular-nums">
                      {index + 1}.
                    </span>
                    <a
                      href={`#${section.anchor}`}
                      className="text-[var(--text-secondary)] hover:text-[var(--text)] hover:underline"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Published by
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                <strong className="text-[var(--text)]">ANYFREEBOOK</strong> — free books,
                textbooks and research papers from twelve open-access libraries. Search them all
                live at{' '}
                <a
                  href="https://anyfreebook.com"
                  className="text-[var(--primary)] hover:underline"
                >
                  anyfreebook.com
                </a>
                .
              </p>
              <a
                href={`/guides/${guide.slug}.pdf`}
                download
                className={`${primaryButtonClass('sm')} mt-3 inline-block no-underline`}
              >
                Download PDF
              </a>
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}
