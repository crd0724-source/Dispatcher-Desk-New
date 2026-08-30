import React, { useState, useRef } from 'react';
import { Load, DocumentType, DocumentStatus } from '../../types/domain.types.ts';
import {
  CreateDocumentInput,
  DOCUMENT_TYPE_LABELS,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  formatDocumentFileSize,
} from './documentTypes.ts';
import { Modal } from '../../components/common/Modal.tsx';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Building2,
  AlertTriangle,
} from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (input: CreateDocumentInput, file?: File) => Promise<void>;
  loads: Load[];
  initialLoadId?: string;
  initialDocType?: DocumentType;
  isUploading?: boolean;
  onOpenAIExtraction?: () => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  loads,
  initialLoadId,
  initialDocType = 'rate_confirmation',
  isUploading = false,
  onOpenAIExtraction,
}) => {
  const [selectedLoadId, setSelectedLoadId] = useState<string>(initialLoadId || (loads[0]?.id || ''));
  const [docType, setDocType] = useState<DocumentType>(initialDocType);
  const [docStatus, setDocStatus] = useState<DocumentStatus>('received');
  const [notes, setNotes] = useState<string>('');
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial load if passed
  React.useEffect(() => {
    if (initialLoadId) {
      setSelectedLoadId(initialLoadId);
    }
  }, [initialLoadId]);

  React.useEffect(() => {
    if (initialDocType) {
      setDocType(initialDocType);
    }
  }, [initialDocType]);

  const handleFileSelection = (file: File) => {
    setErrorMessage(null);

    // MIME type check
    const isAllowedType = ALLOWED_DOCUMENT_MIME_TYPES.some((type) => {
      if (file.type === type) return true;
      // Handle extension fallbacks for docx or specific images
      if (file.name.endsWith('.docx') && type.includes('wordprocessingml')) return true;
      if (file.name.endsWith('.pdf') && type === 'application/pdf') return true;
      return false;
    });

    if (!isAllowedType && file.type) {
      setErrorMessage(
        `Unsupported file format (${file.type}). Allowed formats: PDF, PNG, JPG, WEBP, DOCX.`
      );
      return;
    }

    // Size check
    if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File size (${formatDocumentFileSize(file.size)}) exceeds maximum limit of 15 MB.`
      );
      return;
    }

    setRawFile(file);
    setSelectedFile({
      name: file.name,
      size: file.size,
      type: file.type || 'application/pdf',
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedLoadId) {
      setErrorMessage('Please select a load to associate this paperwork with.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Please select or drop a document file to upload.');
      return;
    }

    try {
      await onUpload(
        {
          load_id: selectedLoadId,
          doc_type: docType,
          doc_status: docStatus,
          file_name: selectedFile.name,
          file_size_bytes: selectedFile.size,
          mime_type: selectedFile.type,
          notes: notes.trim() || null,
          uploaded_by: 'Dispatcher',
        },
        rawFile || undefined
      );

      // Reset form state on success
      setRawFile(null);
      setSelectedFile(null);
      setNotes('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload document.';
      setErrorMessage(msg);
    }
  };

  const selectedLoad = loads.find((l) => l.id === selectedLoadId);

  return (
    <Modal
      id="document-upload-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Freight Paperwork"
      subtitle="Attach Rate Confirmations, Signed BOLs, Delivery Receipts, or Invoices"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1 text-xs text-slate-200">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Load Selector */}
        <div className="space-y-1.5">
          <label htmlFor="doc-load-select" className="block text-slate-300 font-semibold">
            Associated Dispatch Load <span className="text-rose-400">*</span>
          </label>
          <select
            id="doc-load-select"
            value={selectedLoadId}
            onChange={(e) => setSelectedLoadId(e.target.value)}
            required
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">-- Select a Load --</option>
            {loads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.load_number} ({l.origin_state} &rarr; {l.dest_state}) • {l.pipeline_status.toUpperCase()}
              </option>
            ))}
          </select>
          {selectedLoad && (
            <p className="text-[11px] text-slate-400 font-sans">
              Lane: {selectedLoad.origin_city}, {selectedLoad.origin_state} &rarr;{' '}
              {selectedLoad.dest_city}, {selectedLoad.dest_state}
            </p>
          )}
        </div>

        {/* Document Type & Initial Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="doc-type-select" className="block text-slate-300 font-semibold">
              Paperwork Type <span className="text-rose-400">*</span>
            </label>
            <select
              id="doc-type-select"
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="rate_confirmation">Rate Confirmation</option>
              <option value="bol">Bill of Lading (BOL)</option>
              <option value="pod">Proof of Delivery (POD)</option>
              <option value="invoice">Freight Invoice</option>
              <option value="other">Other / Accessorial</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="doc-status-select" className="block text-slate-300 font-semibold">
              Review Status
            </label>
            <select
              id="doc-status-select"
              value={docStatus}
              onChange={(e) => setDocStatus(e.target.value as DocumentStatus)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="received">Received (Ready for Audit)</option>
              <option value="pending">Pending Additional Review</option>
              <option value="verified">Verified & Approved</option>
            </select>
          </div>
        </div>

        {/* AI OCR Assistant Banner for Rate Confirmations */}
        {docType === 'rate_confirmation' && onOpenAIExtraction && (
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-900/60 text-indigo-300">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-100">AI Rate Con OCR & Extraction</p>
                <p className="text-[11px] text-slate-400">
                  Automatically parse broker, rate, route, and accessorials with mandatory dispatcher review.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAIExtraction();
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-sm"
            >
              Launch AI OCR
            </button>
          </div>
        )}

        {/* File Dropzone & Picker */}
        <div className="space-y-1.5">
          <label className="block text-slate-300 font-semibold">
            Select Document File <span className="text-rose-400">*</span>
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelection(e.target.files[0]);
              }
            }}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.docx"
            className="hidden"
          />

          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-950/30 text-indigo-300'
                  : 'border-slate-800 bg-slate-950/60 hover:bg-slate-950 hover:border-slate-700'
              }`}
            >
              <div className="p-3 rounded-full bg-slate-900 border border-slate-800 mb-2">
                <Upload className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="font-semibold text-slate-200 text-xs">
                Click to browse or drag and drop paperwork here
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                PDF, JPG, PNG, WEBP, DOCX (Max 15 MB)
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-indigo-950/70 border border-indigo-800/50 text-indigo-400 shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <p className="font-semibold text-slate-100 text-xs truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {formatDocumentFileSize(selectedFile.size)} • {selectedFile.type || 'Document'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label htmlFor="doc-notes-input" className="block text-slate-300 font-semibold">
            Paperwork Audit Notes & Exceptions
          </label>
          <textarea
            id="doc-notes-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Clean signed BOL with seal # matched; Receiver stamped delivery time 14:30..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600 resize-none"
          />
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUploading || !selectedFile || !selectedLoadId}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Uploading...' : 'Save Paperwork'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
