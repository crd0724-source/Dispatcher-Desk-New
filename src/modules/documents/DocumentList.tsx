import React from 'react';
import {
  FreightDocument,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_SHORT_LABELS,
  formatDocumentFileSize,
} from './documentTypes.ts';
import { DocumentStatus, UserRole } from '../../types/domain.types.ts';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { useTimezone } from '../../contexts/TimezoneContext.tsx';
import { formatInTimezone } from '../../lib/timezones.ts';
import {
  FileText,
  FileSpreadsheet,
  FileCheck,
  FileImage,
  Eye,
  CheckCircle2,
  Trash2,
  Building2,
  Clock,
  User,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState.tsx';

interface DocumentListProps {
  documents: FreightDocument[];
  isLoading: boolean;
  onViewDocument: (doc: FreightDocument) => void;
  onVerifyDocument: (doc: FreightDocument) => void;
  onDeleteDocument: (doc: FreightDocument) => void;
  onViewLoad: (loadId: string) => void;
  userRole: UserRole | null;
  onNewDocumentClick: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading,
  onViewDocument,
  onVerifyDocument,
  onDeleteDocument,
  onViewLoad,
  userRole,
  onNewDocumentClick,
}) => {
  const { operationalTimezone } = useTimezone();

  const canDelete = userRole === 'owner_admin';
  const canVerify = userRole === 'owner_admin' || userRole === 'dispatcher';

  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case 'rate_confirmation':
        return <FileSpreadsheet className="w-4 h-4 text-sky-400" />;
      case 'bol':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'pod':
        return <FileCheck className="w-4 h-4 text-emerald-400" />;
      case 'invoice':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      default:
        return <FileImage className="w-4 h-4 text-slate-400" />;
    }
  };

  if (isLoading) {
    return (
      <div id="documents-loading-skeleton" className="space-y-2 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-slate-950/60 rounded-lg animate-pulse border border-slate-800/40" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        id="empty-documents-list"
        icon={FileText}
        title="No Freight Paperwork Found"
        description="Upload signed rate confirmations, bills of lading (BOLs), proof of delivery receipts (PODs), or carrier factoring invoices."
        actionLabel="Upload First Document"
        onAction={onNewDocumentClick}
      />
    );
  }

  return (
    <div id="documents-table-container" className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 shadow-sm">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-950/90 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
          <tr>
            <th className="py-3 px-4">Document Type</th>
            <th className="py-3 px-4">Load #</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">File Name & Size</th>
            <th className="py-3 px-4">Uploaded By</th>
            <th className="py-3 px-4">Date Uploaded</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {documents.map((doc) => {
            const formattedDate = formatInTimezone(doc.created_at, operationalTimezone, {
              includeDate: true,
              includeTime: true,
            });

            return (
              <tr
                key={doc.id}
                id={`document-row-${doc.id}`}
                onClick={() => onViewDocument(doc)}
                className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
              >
                {/* Document Type + Icon */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 group-hover:border-slate-700">
                      {getDocTypeIcon(doc.doc_type)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-100">
                        {DOCUMENT_TYPE_LABELS[doc.doc_type]}
                      </p>
                      {doc.load && (
                        <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                          {doc.load.origin_city}, {doc.load.origin_state} &rarr; {doc.load.dest_city}, {doc.load.dest_state}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Load Number */}
                <td className="py-3.5 px-4">
                  {doc.load_number ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (doc.load_id) onViewLoad(doc.load_id);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-sky-400 font-mono font-bold text-xs transition-colors cursor-pointer"
                      title="View load operational details"
                    >
                      {doc.load_number}
                    </button>
                  ) : (
                    <span className="text-slate-500 font-mono text-[11px]">Unlinked</span>
                  )}
                </td>

                {/* Review Status Badge */}
                <td className="py-3.5 px-4">
                  <StatusBadge status={doc.doc_status} type="document" size="sm" />
                </td>

                {/* File Details */}
                <td className="py-3.5 px-4 font-mono text-slate-300">
                  <div className="max-w-[200px] truncate" title={doc.file_name || ''}>
                    {doc.file_name || 'Paperwork'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {formatDocumentFileSize(doc.file_size_bytes)}
                  </div>
                </td>

                {/* Uploaded By */}
                <td className="py-3.5 px-4 text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate max-w-[130px]">{doc.uploaded_by || 'Staff'}</span>
                  </div>
                </td>

                {/* Date Uploaded */}
                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                  {formattedDate}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* View Details button */}
                    <button
                      type="button"
                      onClick={() => onViewDocument(doc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="View Paperwork Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Quick Verify button */}
                    {canVerify && doc.doc_status !== 'verified' && (
                      <button
                        type="button"
                        onClick={() => onVerifyDocument(doc)}
                        className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 transition-colors cursor-pointer"
                        title="Verify & Approve Document"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete button (owner_admin only) */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onDeleteDocument(doc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                        title="Delete Document Record"
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
    </div>
  );
};
