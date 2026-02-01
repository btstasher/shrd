import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

const prisma = new PrismaClient();

export const revalidate = 60; // Revalidate every 60 seconds

export default async function BlogPage() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      publishedAt: true,
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      
      {posts.length === 0 ? (
        <p className="text-gray-500">No posts yet.</p>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <article key={post.id} className="border-b border-gray-200 pb-8">
              <Link href={`/blog/${post.slug}`}>
                <h2 className="text-2xl font-semibold hover:text-blue-600 transition-colors">
                  {post.title}
                </h2>
              </Link>
              {post.publishedAt && (
                <time className="text-sm text-gray-500 mt-2 block">
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              )}
              {post.excerpt && (
                <p className="mt-3 text-gray-600">{post.excerpt}</p>
              )}
              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-block text-blue-600 hover:text-blue-800"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
