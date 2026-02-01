import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'shrd - Drop a link. Get a blog post.',
  description: 'Transform any URL into original, publish-ready blog content.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <nav className="border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <a href="/" className="text-2xl font-bold text-primary">shrd</a>
              <a href="/drafts" className="text-sm text-gray-600 hover:text-gray-900">Drafts</a>
            </div>
            <span className="text-sm text-gray-500">Drop a link. Get a blog post.</span>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
