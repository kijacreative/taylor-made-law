import React, { useState, useRef } from 'react';
import { filterDocuments, getDocumentHistory, requestDocumentSignatures, uploadCircleDocument } from '@/services/circles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  FileText, Upload, Clock, CheckCircle, XCircle, AlertCircle,
  Download, Eye, History, Signature, Users, Loader2, X,
  ChevronRight, Calendar, User, Mail
} from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard from '@/components/ui/TMLCard';

function VersionHistoryModal({ documentId, onClose }) {
  const [selectedVersion, setSelectedVersion] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['documentHistory', documentId],
    queryFn: async () => {
      const res = await getDocumentHistory({ document_id: documentId });
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#3a164d]" />
          <span className="font-medium">Loading version history...</span>
        </div>
      </div>
    );
  }

  const { versions = [], signatures = [], document } = data || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Version History</h3>
            <p className="text-sm text-gray-500">{document?.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Versions */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <History className="w-4 h-4" /> Document Versions
            </h4>
            <div className="space-y-3">
              {versions.map((version, idx) => (
                <div
                  key={version.id}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    version.is_current
                      ? 'bg-[#3a164d]/5 border-[#3a164d]/20'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        version.is_current ? 'bg-[#3a164d] text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Version {version.version_number}</p>
                        <p className="text-sm text-gray-500">{version.file_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {version.is_current && (
                        <span className="inline-block px-3 py-1 bg-[#3a164d] text-white text-xs font-semibold rounded-full mb-1">
                          Current
                        </span>
                      )}
                      <p className="text-xs text-gray-400">
                        {format(new Date(version.created_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  {version.change_summary && (
                    <div className="mt-3 pl-13">
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        <span className="font-medium">Changes:</span> {version.change_summary}
                      </p>
                    </div>
                  )}
                  {version.has_tracked_changes && version.tracked_changes_data && (
                    <div className="mt-3 pl-13">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        Contains tracked changes
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Signatures */}
          {signatures.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Signature className="w-4 h-4" /> Signature Requests
              </h4>
              <div className="space-y-3">
                {signatures.map(sig => (
                  <div key={sig.id} className="p-4 rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{sig.signer_name}</p>
                          <p className="text-sm text-gray-500">{sig.signer_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sig.status === 'signed' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            <CheckCircle className="w-3 h-3" /> Signed
                          </span>
                        )}
                        {sig.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                        {sig.status === 'declined' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                            <XCircle className="w-3 h-3" /> Declined
                          </span>
                        )}
                        {sig.status === 'expired' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                            <AlertCircle className="w-3 h-3" /> Expired
                          </span>
                        )}
                      </div>
                    </div>
                    {sig.signed_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Signed on {format(new Date(sig.signed_at), 'MMM d, yyyy')} by {sig.requested_by_name}
                      </p>
                    )}
                    {sig.decline_reason && (
                      <p className="text-xs text-red-600 mt-2">
                        Decline reason: {sig.decline_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SignatureRequestModal({ documentId, onClose }) {
  const queryClient = useQueryClient();
  const [emails, setEmails] = useState('');
  const [deadlineDays, setDeadlineDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const signerEmails = emails.split(',').map(e => e.trim()).filter(e => e);
      if (signerEmails.length === 0) {
        throw new Error('Please enter at least one signer email');
      }

      const res = await requestDocumentSignatures({
        document_id: documentId,
        signers: signerEmails,
        deadline_days: deadlineDays
      });

      if (res.data?.error) throw new Error(res.data.error);

      setSuccess(true);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['documentHistory', documentId] });
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to request signatures');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Request Signatures</h3>
          <p className="text-sm text-gray-500">Send signature requests to team members</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900">Signature Requests Sent!</p>
              <p className="text-sm text-gray-500 mt-2">Notified all signers via email</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signer Emails <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={emails}
                  onChange={e => setEmails(e.target.value)}
                  placeholder="Enter emails separated by commas&#10;john@example.com, jane@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
                  rows={3}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature Deadline
                </label>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <select
                    value={deadlineDays}
                    onChange={e => setDeadlineDays(Number(e.target.value))}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20"
                  >
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <TMLButton type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </TMLButton>
                <TMLButton type="submit" variant="primary" loading={submitting} className="flex-1">
                  <Signature className="w-4 h-4 mr-2" />
                  Send Requests
                </TMLButton>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default function CircleDocuments({ circleId, user, isAdmin }) {
  const [showHistory, setShowHistory] = useState(null);
  const [showSignature, setShowSignature] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const fileInputRef = React.useRef(null);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['circleDocuments', circleId],
    queryFn: () => filterDocuments({ circle_id: circleId }),
    enabled: !!circleId,
    refetchInterval: 10000
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('circle_id', circleId);
      fd.append('title', file.name.replace(/\.[^/.]+$/, ''));
      fd.append('document_type', 'other');

      const res = await uploadCircleDocument(fd);
      if (res.data?.error) throw new Error(res.data.error);

      queryClient.invalidateQueries({ queryKey: ['circleDocuments', circleId] });
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusBadge = (doc) => {
    if (doc.requires_signature) {
      switch (doc.signature_status) {
        case 'fully_signed':
          return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signed</span>;
        case 'pending':
          return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Pending Signatures</span>;
        case 'partially_signed':
          return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-1"><Users className="w-3 h-3" /> Partial</span>;
        default:
          return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">Not Required</span>;
      }
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full capitalize">{doc.status}</span>;
  };

  return (
    <div className="space-y-4">
      {showHistory && <VersionHistoryModal documentId={showHistory} onClose={() => setShowHistory(null)} />}
      {showSignature && <SignatureRequestModal documentId={showSignature} onClose={() => setShowSignature(null)} />}

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Documents</h3>
          <p className="text-sm text-gray-500">Manage case files with version control and e-signatures</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
          <TMLButton variant="primary" size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1.5" /> Upload Document
          </TMLButton>
        </div>
      </div>

      {/* Document List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-[#3a164d]" />
        </div>
      ) : documents.length === 0 ? (
        <TMLCard variant="cream" className="text-center py-16">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-700 font-medium mb-1">No documents yet</p>
          <p className="text-sm text-gray-500">Upload your first document to get started</p>
        </TMLCard>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Version</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#3a164d]/5 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-[#3a164d]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-[250px]">{doc.title}</p>
                        {doc.description && (
                          <p className="text-xs text-gray-500 truncate">{doc.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell capitalize">{doc.document_type?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    <span className="font-medium">v{doc.current_version_number}</span>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(doc)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setShowHistory(doc.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-[#3a164d]/5 transition-colors"
                        title="Version History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      {doc.requires_signature && (
                        <button
                          onClick={() => setShowSignature(doc.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-[#3a164d]/5 transition-colors"
                          title="Request Signatures"
                        >
                          <Signature className="w-4 h-4" />
                        </button>
                      )}
                      <a
                        href={doc.current_file_url}
                        download={doc.current_file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-[#3a164d]/5 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}