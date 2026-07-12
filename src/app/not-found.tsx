import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="content-wrapper py-20 text-center">
      <p className="text-6xl mb-6">📖</p>
      <h1 className="text-3xl font-display font-bold text-[var(--text)] mb-3">
        Page not found
      </h1>
      <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
        The page you&apos;re looking for doesn&apos;t exist. But we have 1,000,000+ free books that do.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
      >
        Go home
      </Link>
    </div>
  );
}
