import { useState, useEffect } from 'react';
import { X, FileText, Layers, Bookmark, Search, Loader2 } from 'lucide-react';
import { DocumentItem, DocumentChunk } from '../types/index.ts';
import { api } from '../services/api.ts';

interface DocumentInspectorModalProps {
  document: DocumentItem | null;
  onClose: () => void;
}

export function DocumentInspectorModal({ document, onClose }: DocumentInspectorModalProps) {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState<number | 'all'>('all');

  useEffect(() => {
    if (!document) return;
    setIsLoading(true);
    api.getDocument(document.id)
      .then((res) => {
        setChunks(res.chunks || []);
      })
      .catch((err) => console.error('Failed to load document chunks:', err))
      .finally(() => setIsLoading(false));
  }, [document]);

  if (!document) return null;

  // Extract unique pages
  const uniquePages = Array.from(new Set(chunks.map((c) => c.pageNumber))).sort((a, b) => a - b);

  const filteredChunks = chunks.filter((c) => {
    const matchesPage = selectedPage === 'all' || c.pageNumber === selectedPage;
    const matchesSearch = !searchQuery.trim() || c.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPage && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#F7F5FF] border border-[#E8E5F0] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E5F0] flex items-center justify-between bg-[#F6F4EE]/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-[#6D4AFF]/10 text-[#6D4AFF] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-lg font-bold text-[#6D4AFF] truncate">
                {document.title}
              </h3>
              <p className="text-xs text-stone-500 flex items-center gap-2">
                <span>{document.fileName}</span>
                <span>•</span>
                <span>{document.pageCount} Pages</span>
                <span>•</span>
                <span>{chunks.length} Semantic Chunks</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-[#E8E5F0] bg-white/60 flex flex-wrap items-center justify-between gap-3">
          {/* Search inside doc */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search extracted passages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-100/70 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6D4AFF] focus:bg-white"
            />
          </div>

          {/* Page filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[11px] font-semibold text-stone-500 mr-1 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Page:
            </span>
            <button
              onClick={() => setSelectedPage('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                selectedPage === 'all'
                  ? 'bg-[#6D4AFF] text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              All ({chunks.length})
            </button>
            {uniquePages.map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setSelectedPage(pageNum)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  selectedPage === pageNum
                    ? 'bg-[#6D4AFF] text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                P. {pageNum}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {/* Document Summary block */}
          {document.summary && (
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-1">
                <Bookmark className="w-3.5 h-3.5 text-emerald-700" />
                <span>Executive Summary & Detected Topics</span>
              </div>
              <p className="text-xs text-emerald-950 leading-relaxed">{document.summary}</p>
              {document.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {document.topics.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-emerald-100/70 border border-emerald-200 text-emerald-900 text-[10px] font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-stone-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#6D4AFF]" />
              <p className="text-xs">Loading page text and semantic index...</p>
            </div>
          ) : filteredChunks.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <p className="text-sm">No passages match your current filter or search query.</p>
            </div>
          ) : (
            filteredChunks.map((chunk) => (
              <div
                key={chunk.id}
                className="p-4 rounded-xl bg-white border border-[#E8E5F0] hover:border-stone-300 transition-all shadow-2xs group"
              >
                <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#6D4AFF] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">
                      Page {chunk.pageNumber}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Chunk #{chunk.chunkIndex + 1}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {chunk.characterCount} characters
                  </span>
                </div>
                <p className="text-xs text-stone-800 leading-relaxed font-sans whitespace-pre-line selection:bg-emerald-100">
                  {chunk.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#F6F4EE]/70 border-t border-[#E8E5F0] flex items-center justify-between text-xs text-stone-500">
          <span>
            Showing {filteredChunks.length} of {chunks.length} passages
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
