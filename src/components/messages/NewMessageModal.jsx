import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X, Loader2, User } from 'lucide-react';

export default function NewMessageModal({ currentUserId, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [starting, setStarting] = useState(false);

  const handleSearch = async (q) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await base44.functions.invoke('searchNetworkAttorneys', { query: q });
      setResults(res.data?.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleStart = async () => {
    if (!selected || starting) return;
    setStarting(true);
    await onSelect(selected.user_id);
    setStarting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">New Message</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">To</label>
          {selected ? (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-[#3a164d]/5 border border-[#3a164d]/20 rounded-xl mb-4">
              <div className="w-8 h-8 rounded-full bg-[#3a164d] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {selected.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{selected.name}</p>
                <p className="text-xs text-gray-500 truncate">{selected.firm_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search attorneys by name, firm, or email..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
              />
            </div>
          )}

          {/* Search Results */}
          {!selected && (
            <div className="max-h-56 overflow-y-auto -mx-1">
              {searching ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[#3a164d]" />
                </div>
              ) : query.length >= 2 && results.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No attorneys found.</p>
              ) : (
                results.map(r => (
                  <button
                    key={r.user_id}
                    onClick={() => setSelected(r)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#a47864] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {r.name?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                      <p className="text-xs text-gray-500 truncate">{r.firm_name} · {r.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!selected || starting}
            className="px-4 py-2 rounded-xl bg-[#3a164d] text-white text-sm font-medium hover:bg-[#2a1038] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {starting && <Loader2 className="w-4 h-4 animate-spin" />}
            Start Conversation
          </button>
        </div>
      </div>
    </div>
  );
}