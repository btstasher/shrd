'use client';

import { useEffect, useState } from 'react';

interface Draft {
  id: string;
  title: string;
  description: string;
  platform: string;
  targetSite: string;
  status: string;
  hidden: boolean;
  createdAt: string;
  publishedUrl?: string;
  collections?: { collection: { id: string; name: string } }[];
}

interface Collection {
  id: string;
  name: string;
  slug: string;
  hidden: boolean;
  _count?: { drafts: number };
}

const SITES = [
  { id: 'all', name: 'All Sites' },
  { id: 'shrd', name: 'shrd.co' },
  { id: 'hrvstr', name: 'hrvstr.com' },
  { id: 'tpl', name: 'theperfectlie.net' },
  { id: 'tplgolf', name: 'tplgolf.com' },
];

type Tab = 'posts' | 'collections';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('posts');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  
  // Collection assignment modal
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [targetCollectionId, setTargetCollectionId] = useState('');
  
  // New collection modal
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    if (tab === 'posts') {
      fetchDrafts();
    } else {
      fetchCollections();
    }
  }, [tab, siteFilter, statusFilter, showArchived]);

  useEffect(() => {
    // Always fetch collections for the dropdown
    fetchCollections();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (siteFilter !== 'all') params.set('site', siteFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (showArchived) params.set('includeArchived', 'true');
      params.set('includeCollections', 'true');

      const response = await fetch(`/api/drafts?${params}`);
      const data = await response.json();
      setDrafts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/collections');
      const data = await response.json();
      setCollections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  // Bulk selection handlers
  const togglePostSelection = (id: string) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPosts(newSelected);
  };

  const toggleAllPosts = () => {
    if (selectedPosts.size === drafts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(drafts.map(d => d.id)));
    }
  };

  const toggleCollectionSelection = (id: string) => {
    const newSelected = new Set(selectedCollections);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCollections(newSelected);
  };

  const toggleAllCollections = () => {
    if (selectedCollections.size === collections.length) {
      setSelectedCollections(new Set());
    } else {
      setSelectedCollections(new Set(collections.map(c => c.id)));
    }
  };

  // Bulk actions
  const bulkArchivePosts = async () => {
    if (selectedPosts.size === 0) return;
    if (!confirm(`Archive ${selectedPosts.size} post(s)?`)) return;

    try {
      await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'archive',
          type: 'posts',
          ids: Array.from(selectedPosts),
        }),
      });
      setSelectedPosts(new Set());
      fetchDrafts();
    } catch (error) {
      console.error('Bulk archive error:', error);
    }
  };

  const bulkToggleVisibility = async (type: 'posts' | 'collections', hide: boolean) => {
    const selected = type === 'posts' ? selectedPosts : selectedCollections;
    if (selected.size === 0) return;

    try {
      await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: hide ? 'hide' : 'show',
          type,
          ids: Array.from(selected),
        }),
      });
      if (type === 'posts') {
        setSelectedPosts(new Set());
        fetchDrafts();
      } else {
        setSelectedCollections(new Set());
        fetchCollections();
      }
    } catch (error) {
      console.error('Bulk visibility error:', error);
    }
  };

  const bulkAssignCollection = async () => {
    if (selectedPosts.size === 0 || !targetCollectionId) return;

    try {
      await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assignCollection',
          type: 'posts',
          ids: Array.from(selectedPosts),
          collectionId: targetCollectionId,
        }),
      });
      setSelectedPosts(new Set());
      setShowCollectionModal(false);
      setTargetCollectionId('');
      fetchDrafts();
    } catch (error) {
      console.error('Bulk assign error:', error);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCollectionName.trim(),
          slug: newCollectionName.trim().toLowerCase().replace(/\s+/g, '-'),
        }),
      });
      setNewCollectionName('');
      setShowNewCollectionModal(false);
      fetchCollections();
    } catch (error) {
      console.error('Create collection error:', error);
    }
  };

  const deleteCollections = async () => {
    if (selectedCollections.size === 0) return;
    if (!confirm(`Delete ${selectedCollections.size} collection(s)? Posts will be preserved.`)) return;

    try {
      await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          type: 'collections',
          ids: Array.from(selectedCollections),
        }),
      });
      setSelectedCollections(new Set());
      fetchCollections();
    } catch (error) {
      console.error('Delete collections error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <a href="/" className="text-primary hover:underline">← Back to Home</a>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setTab('posts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              tab === 'posts'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Posts ({drafts.length})
          </button>
          <button
            onClick={() => setTab('collections')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              tab === 'collections'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Collections ({collections.length})
          </button>
        </nav>
      </div>

      {/* Posts Tab */}
      {tab === 'posts' && (
        <>
          {/* Filters & Bulk Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {SITES.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="REVIEW">In Review</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded"
              />
              Show Archived
            </label>

            {selectedPosts.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-500">
                  {selectedPosts.size} selected
                </span>
                <button
                  onClick={bulkArchivePosts}
                  className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                >
                  Archive
                </button>
                <button
                  onClick={() => setShowCollectionModal(true)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                >
                  Add to Collection
                </button>
                <button
                  onClick={() => bulkToggleVisibility('posts', true)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  Hide
                </button>
                <button
                  onClick={() => bulkToggleVisibility('posts', false)}
                  className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                >
                  Show
                </button>
              </div>
            )}
          </div>

          {/* Posts Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPosts.size === drafts.length && drafts.length > 0}
                        onChange={toggleAllPosts}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Platform</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Site</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Collections</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Visible</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft) => (
                    <tr
                      key={draft.id}
                      className={`border-b hover:bg-gray-50 ${draft.hidden ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedPosts.has(draft.id)}
                          onChange={() => togglePostSelection(draft.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-xs" title={draft.title}>
                          {draft.title}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {draft.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {SITES.find(s => s.id === draft.targetSite)?.name || draft.targetSite}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          draft.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                          draft.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-600' :
                          draft.status === 'REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {draft.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {draft.collections?.map(dc => (
                            <span key={dc.collection.id} className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                              {dc.collection.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {draft.hidden ? (
                          <span className="text-red-500">Hidden</span>
                        ) : (
                          <span className="text-green-500">Visible</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(draft.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {drafts.length === 0 && (
                <div className="text-center py-12 text-gray-500">No posts found</div>
              )}
            </div>
          )}
        </>
      )}

      {/* Collections Tab */}
      {tab === 'collections' && (
        <>
          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowNewCollectionModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600"
            >
              + New Collection
            </button>

            {selectedCollections.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-500">
                  {selectedCollections.size} selected
                </span>
                <button
                  onClick={() => bulkToggleVisibility('collections', true)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  Hide
                </button>
                <button
                  onClick={() => bulkToggleVisibility('collections', false)}
                  className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                >
                  Show
                </button>
                <button
                  onClick={deleteCollections}
                  className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Collections Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedCollections.size === collections.length && collections.length > 0}
                      onChange={toggleAllCollections}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Slug</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Posts</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Visible</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection) => (
                  <tr
                    key={collection.id}
                    className={`border-b hover:bg-gray-50 ${collection.hidden ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedCollections.has(collection.id)}
                        onChange={() => toggleCollectionSelection(collection.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{collection.name}</td>
                    <td className="px-4 py-3 text-gray-600">{collection.slug}</td>
                    <td className="px-4 py-3">{collection._count?.drafts || 0}</td>
                    <td className="px-4 py-3">
                      {collection.hidden ? (
                        <span className="text-red-500">Hidden</span>
                      ) : (
                        <span className="text-green-500">Visible</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {collections.length === 0 && (
              <div className="text-center py-12 text-gray-500">No collections yet</div>
            )}
          </div>
        </>
      )}

      {/* Collection Assignment Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add to Collection</h3>
            <select
              value={targetCollectionId}
              onChange={(e) => setTargetCollectionId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            >
              <option value="">Select a collection...</option>
              {collections.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCollectionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={bulkAssignCollection}
                disabled={!targetCollectionId}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Add {selectedPosts.size} post(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Collection Modal */}
      {showNewCollectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">New Collection</h3>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              onKeyDown={(e) => e.key === 'Enter' && createCollection()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNewCollectionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createCollection}
                disabled={!newCollectionName.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
