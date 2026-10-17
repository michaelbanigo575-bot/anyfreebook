'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  updateMemberRole, removeMember, createInvite, createStudyPlanTemplate, assignStudyPlan,
  type Institution, type InstitutionMember, type InstitutionRole, type StudyPlanTemplate,
} from '@/lib/institutions/client';
import type { InstitutionPublication, InstitutionClassroom, InstitutionComment } from '@/lib/institutions/server';

type Tab = 'members' | 'content' | 'community' | 'study-plans';

export function DashboardClient({
  institution, myRole, initialMembers, publications, classrooms, comments, templates,
}: {
  institution: Institution;
  myRole: InstitutionRole;
  initialMembers: InstitutionMember[];
  publications: InstitutionPublication[];
  classrooms: InstitutionClassroom[];
  comments: InstitutionComment[];
  templates: StudyPlanTemplate[];
}) {
  const [tab, setTab] = useState<Tab>('members');
  const [members, setMembers] = useState(initialMembers);
  const [commentList, setCommentList] = useState(comments);
  const canManage = myRole === 'owner' || myRole === 'admin';
  const students = members.filter(m => m.role === 'student');

  const changeRole = async (profileId: string, role: InstitutionRole) => {
    setMembers(ms => ms.map(m => m.profile_id === profileId ? { ...m, role } : m));
    await updateMemberRole(institution.id, profileId, role);
  };

  const kickMember = async (profileId: string) => {
    if (!confirm('Remove this member?')) return;
    setMembers(ms => ms.filter(m => m.profile_id !== profileId));
    await removeMember(institution.id, profileId);
  };

  const deleteComment = async (id: string) => {
    setCommentList(cs => cs.filter(c => c.id !== id));
    await createClient().from('publication_comments').delete().eq('id', id);
  };

  return (
    <div className="content-wrapper py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Link href={`/institutions/${institution.slug}`} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">← {institution.name}</Link>
      </div>
      <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)] mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-center">
          <div className="text-2xl font-bold font-mono text-[var(--text)]">{members.length}</div>
          <div className="text-xs text-[var(--text-muted)]">Members</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-center">
          <div className="text-2xl font-bold font-mono text-[var(--text)]">{publications.length}</div>
          <div className="text-xs text-[var(--text-muted)]">Publications</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-center">
          <div className="text-2xl font-bold font-mono text-[var(--text)]">{classrooms.length}</div>
          <div className="text-xs text-[var(--text-muted)]">Classes</div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[var(--border-subtle)] overflow-x-auto">
        {([
          ['members', 'Members'], ['content', 'Content'], ['community', 'Community'], ['study-plans', 'Study Plans'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === id ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <MembersTab members={members} canManage={canManage} institutionId={institution.id} onChangeRole={changeRole} onKick={kickMember} />
      )}
      {tab === 'content' && <ContentTab publications={publications} classrooms={classrooms} />}
      {tab === 'community' && <CommunityTab comments={commentList} onDelete={deleteComment} />}
      {tab === 'study-plans' && (
        <StudyPlansTab institutionId={institution.id} templates={templates} students={students} canManage={canManage || myRole === 'teacher'} />
      )}
    </div>
  );
}

function MembersTab({ members, canManage, institutionId, onChangeRole, onKick }: {
  members: InstitutionMember[]; canManage: boolean; institutionId: string;
  onChangeRole: (profileId: string, role: InstitutionRole) => void; onKick: (profileId: string) => void;
}) {
  const [inviteRole, setInviteRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const makeInvite = async () => {
    setGenerating(true);
    const { token } = await createInvite(institutionId, inviteRole);
    setGenerating(false);
    if (token) {
      const base = typeof window !== 'undefined' ? window.location.origin : 'https://anyfreebook.com';
      setInviteLink(`${base}/institutions/join/${token}`);
    }
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <p className="text-sm font-semibold text-[var(--text)] mb-2">Invite a member</p>
          <div className="flex flex-wrap gap-2">
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as typeof inviteRole)} className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text)]">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={makeInvite} disabled={generating} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-60">
              {generating ? 'Generating…' : 'Generate invite link'}
            </button>
          </div>
          {inviteLink && (
            <div className="flex items-center gap-2 mt-3">
              <code className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text)] break-all">{inviteLink}</code>
              <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] flex-shrink-0">Copy</button>
            </div>
          )}
        </div>
      )}

      <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
        {members.map(m => (
          <div key={m.id} className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {(m.profile?.display_name || m.profile?.email || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--text)] truncate">{m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Member'}</div>
              <div className="text-[11px] text-[var(--text-muted)]">joined {new Date(m.joined_at).toLocaleDateString()}</div>
            </div>
            {canManage && m.role !== 'owner' ? (
              <select value={m.role} onChange={e => onChangeRole(m.profile_id, e.target.value as InstitutionRole)} className="px-2 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text)]">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{m.role}</span>
            )}
            {canManage && m.role !== 'owner' && (
              <button onClick={() => onKick(m.profile_id)} className="text-[11px] text-red-500 hover:underline flex-shrink-0">Remove</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentTab({ publications, classrooms }: { publications: InstitutionPublication[]; classrooms: InstitutionClassroom[] }) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Publications</h2>
        {publications.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No publications posted under this institution yet. Post one from the publish form and choose &ldquo;Post as {`this institution`}&rdquo;.</p>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
            {publications.map(p => (
              <Link key={p.id} href={`/read/${p.slug}`} className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--surface-hover)] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text)] truncate">{p.title}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{p.status} · {p.category}</div>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono flex-shrink-0">👁{p.view_count} ❤{p.like_count} 💬{p.comment_count}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Classrooms</h2>
        {classrooms.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No classes hosted under this institution yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
            {classrooms.map(c => (
              <Link key={c.id} href={`/class/${c.room_code}`} className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--surface-hover)] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text)] truncate">{c.title}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{c.status} · {new Date(c.scheduled_at).toLocaleDateString()}</div>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono flex-shrink-0">👥 peak {c.peak_attendance}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CommunityTab({ comments, onDelete }: { comments: InstitutionComment[]; onDelete: (id: string) => void }) {
  if (comments.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No comments on this institution&apos;s content yet.</p>;
  }
  return (
    <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
      {comments.map(c => (
        <div key={c.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-[var(--text)]">{c.body}</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {c.commenter?.display_name || 'Reader'} · on <Link href={`/read/${c.publication?.slug}`} className="hover:underline">{c.publication?.title}</Link> · {new Date(c.created_at).toLocaleDateString()}
              </div>
            </div>
            <button onClick={() => onDelete(c.id)} className="text-[11px] text-red-500 hover:underline flex-shrink-0">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StudyPlansTab({ institutionId, templates, students, canManage }: {
  institutionId: string; templates: StudyPlanTemplate[]; students: InstitutionMember[]; canManage: boolean;
}) {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState(2);
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [localTemplates, setLocalTemplates] = useState(templates);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<string | null>(null);

  const createTemplate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { id } = await createStudyPlanTemplate(institutionId, { title, goalBooksPerWeek: goal, focusCategory: category });
    setSaving(false);
    if (id) {
      setLocalTemplates(ts => [{ id, institution_id: institutionId, title, goal_books_per_week: goal, focus_category: category || null, created_by: '', created_at: new Date().toISOString() }, ...ts]);
      setTitle(''); setCategory('');
    }
  };

  const doAssign = async (templateId: string) => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) return;
    const { assigned, error } = await assignStudyPlan(templateId, ids);
    setResult(error || `Assigned to ${assigned} student${assigned === 1 ? '' : 's'}.`);
    setAssigning(null);
    setSelected({});
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <p className="text-sm font-semibold text-[var(--text)] mb-2">New reading list template</p>
          <div className="grid sm:grid-cols-3 gap-2 mb-2">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Template title" className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text)] sm:col-span-2" />
            <input type="number" min={1} max={20} value={goal} onChange={e => setGoal(+e.target.value)} className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text)]" />
          </div>
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Focus category (optional)" className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text)] mb-2" />
          <button onClick={createTemplate} disabled={saving} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Creating…' : 'Create template'}
          </button>
        </div>
      )}

      {result && <p className="text-sm text-[var(--primary)] bg-[var(--primary-light)] px-3 py-2 rounded-lg">{result}</p>}

      <div className="space-y-3">
        {localTemplates.map(t => (
          <div key={t.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{t.title}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{t.goal_books_per_week} books/week{t.focus_category ? ` · ${t.focus_category}` : ''}</p>
              </div>
              {canManage && (
                <button onClick={() => setAssigning(assigning === t.id ? null : t.id)} className="text-xs font-semibold text-[var(--primary)] hover:underline flex-shrink-0">
                  {assigning === t.id ? 'Cancel' : 'Assign to students'}
                </button>
              )}
            </div>
            {assigning === t.id && (
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                {students.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No students in this institution yet — invite some from the Members tab.</p>
                ) : (
                  <>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3">
                      {students.map(s => (
                        <label key={s.profile_id} className="flex items-center gap-2 text-sm text-[var(--text)]">
                          <input type="checkbox" checked={!!selected[s.profile_id]} onChange={e => setSelected(sel => ({ ...sel, [s.profile_id]: e.target.checked }))} />
                          {s.profile?.display_name || s.profile?.email?.split('@')[0] || 'Student'}
                        </label>
                      ))}
                    </div>
                    <button onClick={() => doAssign(t.id)} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold">Assign to selected</button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
