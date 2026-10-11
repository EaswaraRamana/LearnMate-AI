import { useState } from 'react';
import {
  Search,
  Upload,
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  BookOpen,
  RotateCcw
} from 'lucide-react';
import { DocumentItem } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';
import { DocumentInspectorModal } from '../components/DocumentInspectorModal.tsx';

interface LibraryPageProps {
  documents: DocumentItem[];
  isLoading: boolean;
  onOpenUpload: (retryDoc?: DocumentItem) => void;
  onRefresh: () => void;
  onSelectForTutor?: (docId: string) => void;
}

export function LibraryPage({
  documents,
  isLoading,
  onOpenUpload,
  onRefresh,
  onSelectForTutor
}: LibraryPageProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocForInspect, setSelectedDocForInspect] = useState<DocumentItem | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = doc.title.toLowerCase().includes(q);
    const fileMatch = doc.fileName.toLowerCase().includes(q);
    const topicMatch = doc.topics.some((t) => t.toLowerCase().includes(q));
    return titleMatch || fileMatch || topicMatch;
  });

  const handleDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteDocument(docToDelete.id);
      showToast('success', 'Document Removed', `"${docToDelete.title}" and its indexed chunks were deleted.`);
      setDocToDelete(null);
      onRefresh();
    } catch {
      showToast('error', 'Delete Failed', 'Could not delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#6D4AFF]">My Library</h2>
          <p className="text-xs text-[#77758A]">
            {documents.length} verified learning documents indexed for AI tutoring and quiz generation
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl border border-[#E8E5F0] bg-white hover:bg-[#EEE9FF] text-[#77758A] transition-colors cursor-pointer"
            title="Refresh library"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenUpload()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D4AFF] hover:bg-[#5638D5] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#EEE9FF]" />
            <span>Upload New Material</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-white border border-[#E8E5F0] shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#77758A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, filename, or topic keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F7F5FF] border border-[#E8E5F0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6D4AFF] focus:bg-white text-[#242338]"
          />
        </div>
      </div>

      {/* Document Grid / List */}
      {isLoading ? (
        <div className="py-20 text-center text-[#77758A]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D4AFF]" />
          <p className="text-xs">Loading document collection...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white border border-[#E8E5F0] p-8">
          <div className="w-12 h-12 rounded-2xl bg-[#EEE9FF] text-[#6D4AFF] flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#242338]">
            {searchQuery ? 'No documents match your search' : 'Your Library is empty'}
          </h3>
          <p className="text-xs text-[#77758A] max-w-sm mx-auto mt-1">
            {searchQuery
              ? 'Try different keywords or clear the search filter.'
              : 'Upload your lecture notes, textbook chapters, or study guides to enable source-grounded tutoring.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => onOpenUpload()}
              className="mt-4 px-4 py-2 rounded-xl bg-[#6D4AFF] text-white text-xs font-semibold cursor-pointer shadow-xs hover:bg-[#5638D5]"
            >
              Upload Material
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isReady = doc.status === 'ready';
            const isFailed = doc.status === 'failed';
            const isProcessing = doc.status === 'processing';
            const isUploading = doc.status === 'uploading';

            const displayStatus = isReady
              ? 'Ready'
              : isFailed
              ? 'Failed'
              : isUploading
              ? 'Uploading'
              : 'Processing';

            return (
              <div
                key={doc.id}
                className={`p-5 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between group ${
                  isFailed ? 'border-[#B91C1C]/40 bg-[#FEE2E2]/20' : 'border-[#E8E5F0] hover:border-[#9254DE]'
                }`}
              >
                <div>
                  {/* Status & Date */}
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isReady
                          ? 'bg-[#E8F5EE] text-[#1B6A43] border border-[#1B6A43]/30'
                          : isFailed
                          ? 'bg-[#FEE2E2] text-[#B91C1C] border border-[#B91C1C]/30'
                          : 'bg-[#FEF3C7] text-[#B45309] border border-[#B45309]/30'
                      }`}
                    >
                      {isReady && <CheckCircle2 className="w-3 h-3 text-[#1B6A43]" />}
                      {isFailed && <AlertCircle className="w-3 h-3 text-[#B91C1C]" />}
                      {(isProcessing || isUploading) && <Clock className="w-3 h-3 text-[#B45309] animate-spin" />}
                      <span>{displayStatus}</span>
                    </span>
                    <span className="text-[10px] text-[#77758A]">
                      {new Date(doc.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  {/* Document Title */}
                  <h3 className="font-serif text-base font-bold text-[#242338] group-hover:text-[#6D4AFF] transition-colors line-clamp-2">
                    {doc.title}
                  </h3>
                  <p className="text-[11px] text-[#77758A] font-mono mt-0.5 truncate">
                    {doc.fileName} • {(doc.fileSize / 1024).toFixed(0)} KB
                  </p>

                  {/* Error Notification for Failed Documents with Retry Action */}
                  {isFailed && (
                    <div className="mt-2.5 p-3 rounded-xl bg-[#FEE2E2] border border-[#B91C1C]/30 text-xs text-[#B91C1C]">
                      <div className="flex items-center gap-1 font-semibold text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Processing Error</span>
                      </div>
                      <p className="text-[11px] text-[#242338] mt-1 leading-snug">{doc.errorMessage || 'Text extraction failed. Please retry or upload a text-based document.'}</p>
                      <button
                        onClick={() => onOpenUpload(doc)}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#B91C1C]/30 text-[11px] font-bold text-[#6D4AFF] hover:bg-[#EEE9FF] shadow-2xs transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-[#6D4AFF]" />
                        <span>Retry Processing</span>
                      </button>
                    </div>
                  )}

                  {/* Summary */}
                  {!isFailed && doc.summary && (
                    <p className="text-xs text-[#77758A] mt-2.5 line-clamp-2 leading-relaxed">
                      {doc.summary}
                    </p>
                  )}

                  {/* Detected Topics */}
                  {!isFailed && doc.topics && doc.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {doc.topics.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[#F7F5FF] text-[#242338] text-[10px] font-medium border border-[#E8E5F0]"
                        >
                          {t}
                        </span>
                      ))}
                      {doc.topics.length > 3 && (
                        <span className="text-[10px] text-[#77758A] self-center">
                          +{doc.topics.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Metadata & Actions */}
                <div className="mt-5 pt-3 border-t border-[#E8E5F0] flex items-center justify-between">
                  <div className="text-[11px] text-[#77758A] font-medium">
                    <span>{doc.pageCount} Pages</span>
                    <span className="mx-1.5">•</span>
                    <span>{doc.chunkCount} Chunks</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Inspect button */}
                    {isReady && (
                      <button
                        onClick={() => setSelectedDocForInspect(doc)}
                        className="p-1.5 rounded-lg text-[#77758A] hover:text-[#242338] hover:bg-[#EEE9FF] transition-colors cursor-pointer"
                        title="Inspect extracted passages and page citations"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    {/* Ask Tutor with this doc */}
                    {isReady && onSelectForTutor && (
                      <button
                        onClick={() => onSelectForTutor(doc.id)}
                        className="p-1.5 rounded-lg text-[#6D4AFF] hover:bg-[#EEE9FF] transition-colors cursor-pointer"
                        title="Ask Tutor grounded on this document"
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => setDocToDelete(doc)}
                      className="p-1.5 rounded-lg text-[#77758A] hover:text-[#B91C1C] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Inspector Modal */}
      {selectedDocForInspect && (
        <DocumentInspectorModal
          document={selectedDocForInspect}
          onClose={() => setSelectedDocForInspect(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFFFF] border border-[#E8E5F0] rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#242338]">Delete Document?</h3>
              <p className="text-xs text-[#77758A] mt-1 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-[#242338]">"{docToDelete.title}"</span>? All extracted pages, semantic chunks, and citations will be removed permanently.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold text-[#77758A] hover:text-[#242338] rounded-xl hover:bg-[#EEE9FF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white cursor-pointer transition-colors shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
