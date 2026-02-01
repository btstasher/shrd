'use client';

import { useEffect, useState } from 'react';

interface Draft {
  id: string;
  title: string;
  description: string;
  platform: string;
  targetSite: string;
  status: string;
  createdAt: string;
  publishedUrl?: string;
}

const SITES = [
  { id: 'all', name: 'All Sites' },
  { id: 'shrd', name: 'shrd.co' },
  { id: 'hrvstr', name: 'hrvstr.com' },
  { id: 'tpl', name: 'theperfectlie.net' },
  { id: 'tplgolf', name: 'tplgolf.com' },
];

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchDrafts();
  }, [siteFilter, statusFilter]);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (siteFilter !== 'all') params.set('site', siteFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/drafts?${params}`);
      const data = await response.json();
      setDrafts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (draftId: string, targetSite: string) => {
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, targetSite }),
      });

      if (response.ok) {
        fetchDrafts();
      }
    } catch (error) {
      console.error('Publish error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drafts</h1>
        <a
          href="/"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600"
        >
          + New Post
        </a>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          {SITES.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="REVIEW">In Review</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      {/* Drafts List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No drafts yet. <a href="/" className="text-primary">Create one →</a>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{draft.title}</h3>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {draft.description}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      {draft.platform}
                    </span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                      {SITES.find((s) => s.id === draft.targetSite)?.name}
                    </span>
                    <span
                      className={`px-2 py-1 rounded ${
                        draft.status === 'PUBLISHED'
                          ? 'bg-green-50 text-green-700'
                          : draft.status === 'REVIEW'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {draft.status}
                    </span>
                    <span>
                      {new Date(draft.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {draft.status !== 'PUBLISHED' && (
                    <button
                      onClick={() => handlePublish(draft.id, draft.targetSite)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Publish
                    </button>
                  )}
                  {draft.publishedUrl && (
                    <a
                      href={draft.publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      View →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
