'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SummaryContent { summary: string; keyPoints?: string[] }
interface QuizQuestion { question: string; options: string[]; answer: number; explanation?: string }
interface QuizContent { questions: QuizQuestion[] }

const ERROR_MESSAGES: Record<string, string> = {
  'sign-in-required': 'Sign in to generate AI study aids for this work.',
  'ai-not-configured': 'AI study aids are coming online soon — check back shortly.',
  'daily-cap-reached': "This author's AI quota is used up for today — try again tomorrow.",
  'not-enough-text': 'This work is too short to generate study aids from.',
  'generation-failed': 'The AI had trouble with this one — try again in a minute.',
};

export function AiStudyAids({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryContent | null>(null);
  const [quiz, setQuiz] = useState<QuizContent | null>(null);
  const [busy, setBusy] = useState<'summary' | 'quiz' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState(false);

  const generate = async (kind: 'summary' | 'quiz') => {
    setError(null);
    setBusy(kind);
    try {
      const res = await fetch('/api/ai/publication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, kind }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'sign-in-required') {
          router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
          return;
        }
        setError(ERROR_MESSAGES[data.error] || 'Something went wrong.');
        return;
      }
      if (kind === 'summary') setSummary(data.content as SummaryContent);
      else { setQuiz(data.content as QuizContent); setAnswers({}); setRevealed(false); }
    } catch {
      setError('Network error — try again.');
    } finally {
      setBusy(null);
    }
  };

  const score = quiz ? quiz.questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0) : 0;

  return (
    <section className="mt-10 rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--primary-light)] to-transparent p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">✨</span>
        <h2 className="text-lg font-bold text-[var(--text)]">AI Study Aids</h2>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Instant summary and self-test quiz for &ldquo;{title}&rdquo; — generated once, free for every reader.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => generate('summary')}
          disabled={busy !== null}
          className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {busy === 'summary' ? 'Summarizing…' : summary ? 'Regenerate summary' : '📝 Get summary'}
        </button>
        <button
          onClick={() => generate('quiz')}
          disabled={busy !== null}
          className="px-4 py-2 rounded-xl border-2 border-[var(--primary)] text-[var(--primary)] text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-60"
        >
          {busy === 'quiz' ? 'Building quiz…' : quiz ? 'Retake quiz' : '🧠 Quiz me'}
        </button>
      </div>

      {error && <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">{error}</p>}

      {/* Summary */}
      {summary && (
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] p-5 mb-4">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{summary.summary}</p>
          {summary.keyPoints && summary.keyPoints.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {summary.keyPoints.map((kp, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-[var(--primary)] flex-shrink-0">•</span>{kp}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Quiz */}
      {quiz && (
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] p-5 space-y-5">
          {quiz.questions.map((q, qi) => (
            <div key={qi}>
              <p className="text-sm font-semibold text-[var(--text)] mb-2">{qi + 1}. {q.question}</p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const chosen = answers[qi] === oi;
                  const correct = revealed && oi === q.answer;
                  const wrong = revealed && chosen && oi !== q.answer;
                  return (
                    <button
                      key={oi}
                      onClick={() => !revealed && setAnswers(a => ({ ...a, [qi]: oi }))}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                        correct ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                        : wrong ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                        : chosen ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--text)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}. {opt}
                    </button>
                  );
                })}
              </div>
              {revealed && q.explanation && (
                <p className="text-xs text-[var(--text-muted)] mt-1.5 pl-1">{q.explanation}</p>
              )}
            </div>
          ))}
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              disabled={Object.keys(answers).length < quiz.questions.length}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold disabled:opacity-50"
            >
              {Object.keys(answers).length < quiz.questions.length
                ? `Answer all ${quiz.questions.length} questions to check`
                : 'Check my answers'}
            </button>
          ) : (
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-[var(--text)]">{score}/{quiz.questions.length}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {score === quiz.questions.length ? 'Perfect! 🏆' : score >= quiz.questions.length / 2 ? 'Nice work — review the misses above.' : 'Worth a re-read — the answers are marked above.'}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
