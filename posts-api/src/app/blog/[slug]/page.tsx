import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

const prisma = new PrismaClient();

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug },
    select: { metaTitle: true, metaDescription: true, title: true, excerpt: true },
  });

  if (!post) return {};

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
  };
}

export default async function PostPage({ params }: PageProps) {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug },
  });

  if (!post || post.status !== 'PUBLISHED') {
    notFound();
  }

  return (
    <article className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        {post.publishedAt && (
          <time className="text-gray-500">
            {new Date(post.publishedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        )}
        {post.sourceUrl && (
          <p className="text-sm text-gray-400 mt-2">
            Source: <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">{post.sourcePlatform || 'Link'}</a>
          </p>
        )}
      </header>

      <div 
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
      />
    </article>
  );
}

// Simple markdown to HTML converter
// For production, use a library like marked or remark
function markdownToHtml(markdown: string): string {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Paragraphs
    .replace(/\n\n/gim, '</p><p>')
    // Wrap in paragraph
    .replace(/^(.*)$/s, '<p>$1</p>')
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    // Fix list items
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '');
}
