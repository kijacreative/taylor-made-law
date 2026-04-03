import React, { useState, useRef } from 'react';
import { filterCircleFiles, uploadCircleFile, deleteCircleFile } from '@/services/circles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FolderOpen, Upload, Search, Download, Eye, Trash2, File,
  FileText, FileImage, FileArchive, Loader2, X, ExternalLink
} from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';

function getFileIcon(fileType = '') {
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType === 'application/pdf' || fileType.includes('pdf')) return FileText;
  if (fileType.includes('zip') || fileType.includes('archive') || fileType.includes('compressed')) return FileArchive;
  if (fileType.includes('word') || fileType.includes('document') || fileType.includes('text')) return FileText;
  return File;
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function FilePreviewModal({ file, onClose }) {
  const isImage = file.file_type?.startsWith('image/');
  const isPDF = file.file_type?.includes('pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{file.file_name}</p>
            <p className="text-xs text-gray-400">{formatBytes(file.file_size)} · {file.uploaded_by_name} · {formatDate(file.created_date)}</p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <a href={file.file_url} download={file.file_name} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#3a164d] text-white hover:bg-[#2a1038] transition-colors">
              <Download className="w-4 h-4" />Download
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50 min-h-[300px]">
          {isImage ? (
            <img src={file.file_url} alt={file.file_name} className="max-w-full max-h-full object-contain rounded-lg shadow" />
          ) : isPDF ? (
            <iframe src={file.file_url} title={file.file_name} className="w-full h-[60vh] rounded-lg border border-gray-200" />
          ) : (
            <div className="text-center py-8">
              <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Preview not available for this file type.</p>
              <a href={file.file_url} download={file.file_name} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3a164d] text-white text-sm font-medium hover:bg-[#2a1038] transition-colors">
                <Download className="w-4 h-4" />Download to View
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CircleResources({ circleId, user, isAdmin }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [previewFile, setPreviewFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: allFiles = [], isLoading } = useQuery({
    queryKey: ['circleFiles', circleId],
    queryFn: () => filterCircleFiles({ circle_id: circleId, is_deleted: false }),
    enabled: !!circleId,
    refetchInterval: 15000
  });

  // Filter logic
  const filtered = allFiles.filter(f => {
    const matchSearch = !search || f.file_name?.toLowerCase().includes(search.toLowerCase()) ||
      f.uploaded_by_name?.toLowerCase().includes(search.toLowerCase());
    let matchType = true;
    if (filterType === 'image') matchType = f.file_type?.startsWith('image/');
    else if (filterType === 'pdf') matchType = f.file_type?.includes('pdf');
    else if (filterType === 'doc') matchType = f.file_type?.includes('word') || f.file_type?.includes('document') || f.file_type?.includes('text/plain');
    else if (filterType === 'other') matchType = !f.file_type?.startsWith('image/') && !f.file_type?.includes('pdf') && !f.file_type?.includes('word') && !f.file_type?.includes('document');
    return matchSearch && matchType;
  });

  const handleDirectUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('circle_id', circleId);
      const res = await uploadCircleFile(fd);
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ['circleFiles', circleId] });
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.file_name}"? This cannot be undone.`)) return;
    try {
      await deleteCircleFile({ file_id: file.id });
      queryClient.invalidateQueries({ queryKey: ['circleFiles', circleId] });
    } catch (err) {
      alert('Failed to delete file.');
    }
  };

  const typeFilters = [
    { value: 'all', label: 'All Files' },
    { value: 'image', label: 'Images' },
    { value: 'pdf', label: 'PDFs' },
    { value: 'doc', label: 'Documents' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="space-y-4">
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {typeFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  filterType === f.value
                    ? 'bg-[#3a164d] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleDirectUpload} />
          <TMLButton variant="primary" size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1.5" />Upload File
          </TMLButton>
        </div>
      </div>

      {uploadError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-lg">{uploadError}</div>
      )}

      {/* File List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-[#3a164d]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-4 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-700 font-medium mb-1">No files yet</p>
          <p className="text-sm text-gray-400">
            {search ? `No files match "${search}"` : 'Files shared in chat or uploaded here will appear in this library.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">File</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Uploaded By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Size</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(file => {
                const Icon = getFileIcon(file.file_type);
                const isImage = file.file_type?.startsWith('image/');
                const canDelete = isAdmin || file.uploaded_by_user_id === user.id;
                return (
                  <tr key={file.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {isImage ? (
                          <img src={file.file_url} alt={file.file_name}
                            className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-[#3a164d]/5 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-[#3a164d]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[180px]">{file.file_name}</p>
                          {file.message_id && (
                            <span className="text-xs text-[#3a164d]/60">Shared in chat</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {file.uploaded_by_name || file.uploaded_by_email || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell whitespace-nowrap">
                      {formatDate(file.created_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell whitespace-nowrap">
                      {formatBytes(file.file_size)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-[#3a164d]/5 transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={file.file_url}
                          download={file.file_name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-[#3a164d]/5 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(file)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50 text-xs text-gray-400">
            {filtered.length} file{filtered.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </div>
        </div>
      )}
    </div>
  );
}