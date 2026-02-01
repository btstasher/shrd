'use client';

import { useState } from 'react';
import { processUrl } from './actions';

// Target sites for publishing
const TARGET_SITES = [
  { id: 'shrd', name: 'shrd.co', url: 'https://shrd.co' },
  { id: 'hrvstr', name: 'hrvstr.com', url: 'https://hrvstr.com' },
  { id: 'tpl', name: 'theperfectlie.net', url: 'https://theperfectlie.net' },
  { id: 'tplgolf', name: 'tplgolf.com', url: 'https://tplgolf.com' },
];

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetSite, setTargetSite] = useState('shrd');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await processUrl(url, targetSite);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* URL Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            Paste any URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or any article, tweet, podcast..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-lg"
            disabled={loading}
          />
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label htmlFor="target" className="block text-sm font-medium text-gray-700 mb-2">
              Draft for
            </label>
            <select
              id="target"
              value={targetSite}
              onChange={(e) => setTargetSite(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              disabled={loading}
            >
              {TARGET_SITES.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="mt-7 px-8 py-3 bg-primary text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Generate'}
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Preview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Preview</span>
              <span className="text-xs text-gray-500">
                {TARGET_SITES.find(s => s.id === targetSite)?.name}
              </span>
            </div>
            <div className="p-6 prose max-w-none">
              <h1 className="text-2xl font-bold mb-4">{result.blog.title}</h1>
              <p className="text-gray-600 mb-6">{result.blog.description}</p>
              
              {result.blog.insights?.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold mt-6 mb-3">Key Insights</h2>
                  <ul className="space-y-2">
                    {result.blog.insights.map((insight: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span>🎯</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {result.blog.quotes?.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold mt-6 mb-3">Notable Quotes</h2>
                  {result.blog.quotes.map((quote: string, i: number) => (
                    <blockquote key={i} className="border-l-4 border-primary pl-4 italic text-gray-600 my-4">
                      "{quote}"
                    </blockquote>
                  ))}
                </>
              )}

              {/* Embed */}
              <div className="mt-6" dangerouslySetInnerHTML={{ __html: result.embed }} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => navigator.clipboard.writeText(result.markdown)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Copy Markdown
            </button>
            <button
              onClick={() => {/* TODO: Save draft */}}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Save Draft
            </button>
            <button
              onClick={() => {/* TODO: Publish */}}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Publish to {TARGET_SITES.find(s => s.id === targetSite)?.name}
            </button>
          </div>

          {/* Raw Markdown */}
          <details className="border border-gray-200 rounded-lg">
            <summary className="px-4 py-2 bg-gray-50 cursor-pointer text-sm font-medium text-gray-600">
              View Raw Markdown
            </summary>
            <pre className="p-4 text-sm overflow-x-auto bg-gray-900 text-gray-100">
              {result.markdown}
            </pre>
          </details>
        </div>
      )}

      {/* Supported Platforms */}
      <div className="pt-8 border-t border-gray-200">
        <h2 className="text-sm font-medium text-gray-500 mb-4">Supported Platforms</h2>
        <div className="flex flex-wrap gap-3">
          {['YouTube', 'Articles', 'Podcasts', 'Twitter/X', 'TikTok', 'Instagram'].map((platform) => (
            <span key={platform} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
              {platform}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
