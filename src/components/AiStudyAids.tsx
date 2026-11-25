'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuizContent, QuizQuestion, SummaryContent } from '@/lib/ai/studyAids';

type Summary = Partial<SummaryContent> & { summary: string; partial?: boolean };
type Quiz = QuizContent & { partial?: boolean };

const ERROR_MESSAGES: Record<string, string> = {
  'sign-in-required': 'Sign in to make study aids for this work.',
  'ai-not-configured': 'Study aids are not switched on yet. Check back soon.',
  'daily-cap-reached': "This author's study aid limit is used up for today. Try again tomorrow.",
  'slow-down': 'That was a lot of requests. Wait a minute and try again.',
  'not-enough-text': 'There is not enough text here to study yet.',
  'file-too-large': 'The attached file is over 40 MB, which is too big to read.',
  'file-unsupported': 'This file type can’t be read. PDF, Word (.docx), PowerPoint (.pptx), EPUB and text files work.',
  'file-unreachable': 'The attached file could not be opened. Try again shortly.',
  'generation-failed': 'This one didn’t work. Try again in a minute.',
};

const primary = 'min-h-[48px] px-5 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold disabled:opacity-60';
const secondary = 'min-h-[48px] px-5 rounded-xl border border-[var(--primary)] text-[var(--primary)] text-sm font-semibold disabled:opacity-60';
const card = 'premium-card rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4 sm:p-5';
const heading = 'text-xs font-bold uppercase tracking-wider text-[var(--primary)] mb-2';

const PartialNote = () => (
  <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">The attached file couldn’t be read, so this covers only the text on this page.</p>
);

function SummaryView({ data }: { data: Summary }) {
  const [copied, setCopied] = useState(false);
  const asText = [
    data.summary,
    ...(data.keyPoints || []).map(p => `• ${p}`),
    ...(data.sections || []).map(s => `${s.heading}: ${s.gist}`),
    ...(data.terms || []).map(t => `${t.term}: ${t.meaning}`),
    data.takeaway ? `Remember: ${data.takeaway}` : '',
  ].filter(Boolean).join('\n');

  return (
    <div className={`${card} space-y-4`}>
      {data.partial && <PartialNote />}
      <div>
        <h3 className={heading}>In short</h3>
        <p className="text-[15px] leading-relaxed text-[var(--text)]">{data.summary}</p>
      </div>
      {!!data.keyPoints?.length && (
        <div>
          <h3 className={heading}>Key points</h3>
          <ol className="space-y-2">
            {data.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                <span aria-hidden className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                {point}
              </li>
            ))}
          </ol>
        </div>
      )}
      {!!data.sections?.length && (
        <div>
          <h3 className={heading}>Part by part</h3>
          <div className="space-y-1.5">
            {data.sections.map((s, i) => (
              <details key={i} className="rounded-xl bg-[var(--bg-secondary)] px-3">
                <summary className="min-h-[44px] flex items-center cursor-pointer text-sm font-semibold text-[var(--text)]">{s.heading}</summary>
                <p className="pb-3 text-sm leading-relaxed text-[var(--text-secondary)]">{s.gist}</p>
              </details>
            ))}
          </div>
        </div>
      )}
      {!!data.terms?.length && (
        <div>
          <h3 className={heading}>Words to know</h3>
          <dl className="space-y-1.5">
            {data.terms.map((t, i) => (
              <div key={i} className="text-sm leading-relaxed">
                <dt className="inline font-semibold text-[var(--text)]">{t.term}: </dt>
                <dd className="inline text-[var(--text-secondary)]">{t.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {data.takeaway && (
        <p className="rounded-xl border-l-4 border-[var(--primary)] bg-[var(--primary-light)] p-3 text-sm font-semibold text-[var(--text)]">Remember this: {data.takeaway}</p>
      )}
      <button type="button" onClick={() => { navigator.clipboard.writeText(asText).then(() => setCopied(true)).catch(() => {}); }} className="text-sm font-semibold text-[var(--primary)] min-h-[40px]">
        {copied ? 'Copied' : 'Copy notes'}
      </button>
    </div>
  );
}

/** One question at a time with the answer explained straight away; missed ones can be practised again. */
function QuizView({ data }: { data: Quiz }) {
  const [round, setRound] = useState<QuizQuestion[]>(data.questions);
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [missed, setMissed] = useState<QuizQuestion[]>([]);
  const done = at >= round.length;

  const start = (questions: QuizQuestion[]) => { setRound(questions); setAt(0); setPicked(null); setMissed([]); };

  if (done) {
    const score = round.length - missed.length;
    return (
      <div className={`${card} text-center`}>
        <p className="text-4xl font-serif-title font-bold text-[var(--text)]">{score}/{round.length}</p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {missed.length === 0 ? 'You got every one. Well done.' : score >= round.length / 2 ? 'Good work. Practise the ones you missed.' : 'Keep going. Read the explanations, then try again.'}
        </p>
        {missed.length > 0 && (
          <ul className="mt-4 space-y-2 text-left">
            {missed.map((q, i) => (
              <li key={i} className="rounded-xl bg-[var(--bg-secondary)] p-3 text-sm">
                <p className="font-semibold text-[var(--text)]">{q.question}</p>
                <p className="mt-1 text-[var(--text-secondary)]">{q.options[q.answer]}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {missed.length > 0 && <button type="button" onClick={() => start(missed)} className={primary}>Practise missed ({missed.length})</button>}
          <button type="button" onClick={() => start(data.questions)} className={secondary}>Start again</button>
        </div>
      </div>
    );
  }

  const q = round[at];
  const answered = picked !== null;
  return (
    <div className={card}>
      {data.partial && <PartialNote />}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-1.5 rounded-full bg-[var(--primary-light)]">
          <div className="h-1.5 rounded-full bg-[var(--primary)] transition-all" style={{ width: `${((at + (answered ? 1 : 0)) / round.length) * 100}%` }} />
        </div>
        <span className="text-xs font-semibold text-[var(--text-muted)]">{at + 1} of {round.length}</span>
      </div>
      <p className="font-serif-title text-lg font-bold leading-snug text-[var(--text)] mb-3">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((option, i) => {
          const right = answered && i === q.answer;
          const wrong = answered && i === picked && i !== q.answer;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => { setPicked(i); if (i !== q.answer) setMissed(m => [...m, q]); }}
              className={`w-full flex items-start gap-3 text-left min-h-[48px] p-3 rounded-xl border text-sm transition-colors ${
                right ? 'border-emerald-500 bg-emerald-500/10 text-[var(--text)]'
                : wrong ? 'border-rose-500 bg-rose-500/10 text-[var(--text)]'
                : 'border-[var(--border)] text-[var(--text-secondary)] enabled:hover:bg-[var(--surface-hover)]'
              }`}
            >
              <span aria-hidden className="font-bold">{right ? '✓' : wrong ? '✕' : String.fromCharCode(65 + i)}</span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {answered && (
          <>
            <p className="mt-3 rounded-xl bg-[var(--bg-secondary)] p-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              <strong className="text-[var(--text)]">{picked === q.answer ? 'Correct. ' : 'Not quite. '}</strong>{q.explanation}
            </p>
            <button type="button" onClick={() => { setAt(at + 1); setPicked(null); }} className={`${primary} w-full mt-3`}>
              {at + 1 === round.length ? 'See my score' : 'Next question'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function AiStudyAids({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [view, setView] = useState<'summary' | 'quiz' | null>(null);
  const [busy, setBusy] = useState<'summary' | 'quiz' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (kind: 'summary' | 'quiz') => {
    setError(null);
    if (kind === 'summary' ? summary : quiz) { setView(kind); return; }
    setBusy(kind);
    try {
      const res = await fetch('/api/ai/publication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === 'sign-in-required') {
          router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
          return;
        }
        setError(ERROR_MESSAGES[data.error] || 'Something went wrong. Try again.');
        return;
      }
      if (kind === 'summary') setSummary(data.content as Summary);
      else setQuiz(data.content as Quiz);
      setView(kind);
    } catch {
      setError('Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-label="Study aids" className="mt-6">
      <h2 className="text-xl font-display font-bold text-[var(--text)]">Study this with AI</h2>
      <p className="text-sm text-[var(--text-muted)] mt-1 mb-3">A shorter version and a self-test for “{title}”. AI can make mistakes, so check important points in the work.</p>

      <div className="grid grid-cols-2 gap-2 mb-3 max-w-md">
        <button type="button" onClick={() => open('summary')} disabled={busy !== null} aria-pressed={view === 'summary'} className={view === 'quiz' ? secondary : primary}>
          {busy === 'summary' ? 'Reading…' : 'Summarise'}
        </button>
        <button type="button" onClick={() => open('quiz')} disabled={busy !== null} aria-pressed={view === 'quiz'} className={view === 'quiz' ? primary : secondary}>
          {busy === 'quiz' ? 'Writing quiz…' : 'Quiz me'}
        </button>
      </div>

      {busy && <p role="status" className="mb-3 text-sm text-[var(--text-muted)]">This can take up to a minute for a big file.</p>}
      {error && <p role="alert" className="mb-3 text-sm text-amber-700 dark:text-amber-300">{error}</p>}

      {summary && view === 'summary' && <SummaryView data={summary} />}
      {/* Kept mounted so switching to the summary does not lose quiz progress */}
      {quiz && <div hidden={view !== 'quiz'}><QuizView data={quiz} /></div>}
    </section>
  );
}
