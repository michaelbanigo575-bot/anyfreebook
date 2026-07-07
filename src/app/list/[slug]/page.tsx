import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ListDetailClient } from './ListDetailClient';

async function getList(slug: string) {
  const supabase = createClient();
  const { data: list } = await supabase
    .from('collections')
    .select('id, user_id, title, slug, description, is_public, created_at')
    .eq('slug', slug)
    .single();

  if (!list) return null;

  const { data: books } = await supabase
    .from('collection_books')
    .select('book_id, book_title, book_author, book_slug, book_cover_url, added_at')
    .eq('collection_id', list.id)
    .order('added_at', { ascending: false });

  return { list, books: books || [] };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getList(params.slug);
  if (!data) return {};
  return {
    title: `${data.list.title} — Reading List | ANYFREEBOOK`,
    description: data.list.description || `A free-books reading list on ANYFREEBOOK with ${data.books.length} books.`,
  };
}

export default async function ListDetailPage({ params }: { params: { slug: string } }) {
  const data = await getList(params.slug);
  if (!data || !data.list.is_public) notFound();

  return <ListDetailClient list={data.list} initialBooks={data.books} />;
}
