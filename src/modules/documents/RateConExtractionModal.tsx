import React, { useState, useEffect, useRef } from 'react';
import {
  Load,
  Client,
  Broker,
  Truck,
  Driver,
  EquipmentType,
} from '../../types/domain.types.ts';
import { LoadWithRelations } from '../loads/loadTypes.ts';
import {
  RateConfirmationExtraction,
  ExtractedBrokerInfo,
} from './extractionTypes.ts';
import { extractionService } from './extractionService.ts';
import { SAMPLE_RATE_CONFIRMATIONS, SampleRateConDoc } from './sampleRateConfirmations.ts';
import { calculateProfitability, formatCurrency, formatRPM, formatMiles } from '../../lib/calculations.ts';
import { Modal } from '../../components/common/Modal.tsx';
import {
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Building2,
  Truck as TruckIcon,
  User,
  DollarSign,
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
  HelpCircle,
  Eye,
  Info,
  X,
  FileCheck,
} from 'lucide-react';

interface RateConExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  loads: Load[];
  clients: Client[];
  brokers: Broker[];
  trucks: Truck[];
  drivers: Driver[];
  initialLoadId?: string;
  onExtractionApplied: (load: LoadWithRelations) => void;
}

export const RateConExtractionModal: React.FC<RateConExtractionModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  loads,
  clients,
  brokers,
  trucks,
  drivers,
  initialLoadId,
  onExtractionApplied,
}) => {
  // Processing States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [selectedSample, setSelectedSample] = useState<SampleRateConDoc | null>(SAMPLE_RATE_CONFIRMATIONS[0]);
  const [inputTab, setInputTab] = useState<'sample' | 'upload' | 'text'>('sample');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted Result State
  const [extraction, setExtraction] = useState<RateConfirmationExtraction | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  // Application / Form State
  const [targetMode, setTargetMode] = useState<'existing' | 'new'>(initialLoadId ? 'existing' : 'new');
  const [targetLoadId, setTargetLoadId] = useState<string>(initialLoadId || (loads[0]?.id || ''));
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('');
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // Editable Overrides State
  const [formFields, setFormFields] = useState<{
    load_number: string;
    rate: number;
    loaded_miles: number;
    deadhead_miles: number;
    origin_city: string;
    origin_state: string;
    origin_zip: string;
    pickup_datetime: string;
    dest_city: string;
    dest_state: string;
    dest_zip: string;
    delivery_datetime: string;
    equipment_type: EquipmentType;
    commodity: string;
    weight_lbs: number;
    special_instructions: string;
  }>({
    load_number: '',
    rate: 0,
    loaded_miles: 0,
    deadhead_miles: 0,
    origin_city: '',
    origin_state: '',
    origin_zip: '',
    pickup_datetime: '',
    dest_city: '',
    dest_state: '',
    dest_zip: '',
    delivery_datetime: '',
    equipment_type: 'dry_van',
    commodity: '',
    weight_lbs: 0,
    special_instructions: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial load if passed
  useEffect(() => {
    if (initialLoadId) {
      setTargetLoadId(initialLoadId);
      setTargetMode('existing');
    }
  }, [initialLoadId]);

  // Handle extraction trigger
  const handleRunExtraction = async () => {
    setIsExtracting(true);
    setErrorMessage(null);

    try {
      let result: RateConfirmationExtraction;

      if (inputTab === 'sample' && selectedSample) {
        result = await extractionService.extractRateConfirmation({
          documentText: selectedSample.rawText,
          fileName: selectedSample.simulatedFileName,
        });
      } else if (inputTab === 'upload' && selectedFile) {
        result = await extractionService.extractRateConfirmation({
          file: selectedFile,
          fileName: selectedFile.name,
        });
      } else if (inputTab === 'text' && pastedText.trim()) {
        result = await extractionService.extractRateConfirmation({
          documentText: pastedText.trim(),
          fileName: 'Pasted_RateCon.txt',
        });
      } else {
        throw new Error('Please select a sample, upload a rate confirmation file, or paste text to extract.');
      }

      setExtraction(result);

      // Auto-match broker if matching name or MC number exists
      const match = brokers.find((b) => {
        if (result.broker.mc_number && b.mc_number && b.mc_number.replace(/\D/g, '') === result.broker.mc_number.replace(/\D/g, '')) {
          return true;
        }
        return b.company_name.toLowerCase().includes(result.broker.company_name.toLowerCase()) ||
          result.broker.company_name.toLowerCase().includes(b.company_name.toLowerCase());
      });

      if (match) {
        setSelectedBrokerId(match.id);
      } else if (brokers.length > 0) {
        setSelectedBrokerId(brokers[0].id);
      }

      // Initialize form fields with extracted data
      setFormFields({
        load_number: result.load_info.load_number || '',
        rate: result.load_info.rate || 0,
        loaded_miles: 750, // Default estimate
        deadhead_miles: 40,
        origin_city: result.origin.city || '',
        origin_state: result.origin.state || '',
        origin_zip: result.origin.zip || '',
        pickup_datetime: result.origin.pickup_datetime || '',
        dest_city: result.destination.city || '',
        dest_state: result.destination.state || '',
        dest_zip: result.destination.zip || '',
        delivery_datetime: result.destination.delivery_datetime || '',
        equipment_type: (result.load_info.equipment_type as EquipmentType) || 'dry_van',
        commodity: result.load_info.commodity || '',
        weight_lbs: result.load_info.weight_lbs || 0,
        special_instructions: result.load_info.special_instructions || '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract rate confirmation.';
      setErrorMessage(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  // Calculate live financial profitability based on current rate and miles
  const currentProfitability = calculateProfitability({
    rate: formFields.rate,
    loadedMiles: formFields.loaded_miles,
    deadheadMiles: formFields.deadhead_miles,
    fuelExpense: formFields.rate * 0.19, // ~19% standard fuel benchmark
    driverPay: formFields.rate * 0.27, // 27% gross benchmark
    otherExpenses: 50,
  });

  // Apply extraction to load
  const handleApplyToLoad = async () => {
    if (!extraction) return;
    setIsApplying(true);
    setErrorMessage(null);

    try {
      if (targetMode === 'new' && !selectedClientId) {
        throw new Error('Please select a Carrier Client to assign this new load to.');
      }

      if (targetMode === 'existing' && !targetLoadId) {
        throw new Error('Please select an existing load to update.');
      }

      if (!formFields.origin_city || !formFields.origin_state) {
        throw new Error('Origin City and State are required.');
      }

      if (!formFields.dest_city || !formFields.dest_state) {
        throw new Error('Destination City and State are required.');
      }

      const result = await extractionService.applyExtractionToLoad({
        targetLoadId: targetMode === 'existing' ? targetLoadId : undefined,
        createNewLoad: targetMode === 'new',
        organizationId,
        clientId: selectedClientId,
        brokerId: selectedBrokerId || null,
        truckId: selectedTruckId || null,
        driverId: selectedDriverId || null,
        extractedData: extraction,
        overriddenFields: {
          load_number: formFields.load_number,
          rate: formFields.rate,
          origin_city: formFields.origin_city,
          origin_state: formFields.origin_state,
          origin_zip: formFields.origin_zip,
          pickup_datetime: formFields.pickup_datetime,
          dest_city: formFields.dest_city,
          dest_state: formFields.dest_state,
          dest_zip: formFields.dest_zip,
          delivery_datetime: formFields.delivery_datetime,
          equipment_type: formFields.equipment_type,
          commodity: formFields.commodity,
          weight_lbs: formFields.weight_lbs,
          loaded_miles: formFields.loaded_miles,
          deadhead_miles: formFields.deadhead_miles,
          special_instructions: formFields.special_instructions,
        },
        attachDocument: {
          file_name: extraction.provenance?.fileName || 'Rate_Confirmation.pdf',
          file_size_bytes: extraction.provenance?.fileSize || 180000,
          mime_type: extraction.provenance?.mimeType || 'application/pdf',
        },
      });

      onExtractionApplied(result.load);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply extraction to load.';
      setErrorMessage(msg);
    } finally {
      setIsApplying(false);
    }
  };

  const selectedLoad = loads.find((l) => l.id === targetLoadId);

  // Render confidence pill helper
  const renderConfidenceBadge = (score?: number) => {
    const val = score || 0;
    let color = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';
    if (val < 75) {
      color = 'bg-rose-950/80 text-rose-300 border-rose-800/60';
    } else if (val < 90) {
      color = 'bg-amber-950/80 text-amber-300 border-amber-800/60';
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums border ${color}`}>
        <Sparkles className="w-3 h-3" />
        <span>{val}% Conf</span>
      </span>
    );
  };

  return (
    <Modal
      id="rate-con-extraction-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="AI Rate Confirmation OCR & Extraction"
      subtitle="Extract broker agreements, lanes, rates, and accessorials with mandatory dispatcher review and approval"
      maxWidth="3xl"
    >
      <div className="space-y-4 p-1 text-xs text-slate-200">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-0.5">
              <p className="font-semibold">Extraction Notice</p>
              <p className="text-xs text-rose-300">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* STEP 1: DOCUMENT INPUT STAGE (if not yet extracted or user wants to change) */}
        {!extraction ? (
          <div className="space-y-4">
            {/* Input Selection Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setInputTab('sample')}
                className={`h-8 px-3 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                  inputTab === 'sample'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                1-Click Sample Rate Cons
              </button>
              <button
                type="button"
                onClick={() => setInputTab('upload')}
                className={`h-8 px-3 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                  inputTab === 'upload'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Upload Document (PDF / Image)
              </button>
              <button
                type="button"
                onClick={() => setInputTab('text')}
                className={`h-8 px-3 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                  inputTab === 'text'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Paste Rate Con Text
              </button>
            </div>

            {/* TAB: Sample Documents */}
            {inputTab === 'sample' && (
              <div className="space-y-3">
                <p className="text-slate-400 text-xs">
                  Select a pre-loaded, authentic freight Rate Confirmation to test instant OCR parsing and financial extraction:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SAMPLE_RATE_CONFIRMATIONS.map((sample) => {
                    const isSelected = selectedSample?.id === sample.id;
                    return (
                      <div
                        key={sample.id}
                        onClick={() => setSelectedSample(sample)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500/50 shadow-xs'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="font-bold text-slate-100 text-xs truncate">{sample.title}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono tabular-nums text-[11px] shrink-0 font-bold">
                            {formatCurrency(sample.rate)}
                          </span>
                        </div>
                        <p className="text-[11px] text-sky-400 font-mono mb-1">{sample.lane}</p>
                        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                          {sample.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: File Upload */}
            {inputTab === 'upload' && (
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                />

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 border-2 border-dashed border-slate-800 hover:border-indigo-500 bg-slate-950/60 hover:bg-slate-950 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
                  >
                    <div className="p-3 rounded-full bg-slate-900 border border-slate-800 mb-2">
                      <Upload className="w-6 h-6 text-indigo-400" />
                    </div>
                    <p className="font-semibold text-slate-200 text-xs">
                      Click to upload Rate Confirmation PDF or scanned paperwork
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-1">
                      PDF, JPG, PNG, WEBP (Max 15 MB)
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/50 shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-100 truncate" title={selectedFile.name}>{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Text Paste */}
            {inputTab === 'text' && (
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Paste Rate Confirmation Text from Email or Broker Portal
                </label>
                <textarea
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste load confirmation text here (e.g. Apex Freight, Rate: $2,450, Dallas TX to Atlanta GA...)"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-600 resize-none"
                />
              </div>
            )}

            {/* Run Button */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Zero Autonomous Mutations • Dispatcher Verification Required</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRunExtraction}
                  disabled={isExtracting}
                  className="h-9 inline-flex items-center gap-2 px-5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className={`w-4 h-4 ${isExtracting ? 'animate-spin' : ''}`} />
                  <span>{isExtracting ? 'Running AI OCR Extraction...' : 'Extract Rate Con Details'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: EXTRACTION AUDIT & APPROVAL STAGE */
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header & Confidence Strip */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-800/60 text-indigo-400 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-100 text-sm truncate">
                      {extraction.broker.company_name || 'Extracted Rate Confirmation'}
                    </span>
                    {renderConfidenceBadge(extraction.confidence_scores.overall)}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5 truncate">
                    Source: {extraction.provenance?.fileName} • Model: {extraction.provenance?.model || 'Gemini 3.7 Flash'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRawText(!showRawText)}
                  className="h-8 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showRawText ? 'Hide Source' : 'View Source Text'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExtraction(null)}
                  className="h-8 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-scan / Change</span>
                </button>
              </div>
            </div>

            {/* Optional Raw Source Text Collapsible */}
            {showRawText && (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Raw Document Text</span>
                <pre className="text-[11px] text-slate-300 font-mono max-h-36 overflow-y-auto whitespace-pre-wrap bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  {selectedSample?.rawText || extraction.load_info.raw_text || 'Document binary analyzed directly by Gemini Vision.'}
                </pre>
              </div>
            )}

            {/* Warnings Box if any */}
            {extraction.warnings && extraction.warnings.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Verification Warnings & Discrepancies</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-amber-300/90 space-y-0.5 font-sans">
                  {extraction.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Target Mode Selector: Update Existing Load vs Create New Load */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Target Dispatch Assignment
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetMode('new')}
                    className={`h-7 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      targetMode === 'new'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    + Create New Load
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('existing')}
                    className={`h-7 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      targetMode === 'existing'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Update Existing Load
                  </button>
                </div>
              </div>

              {targetMode === 'existing' ? (
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Select Load to Update</label>
                  <select
                    value={targetLoadId}
                    onChange={(e) => setTargetLoadId(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer"
                  >
                    {loads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.load_number} ({l.origin_state} &rarr; {l.dest_state}) • Rate: {formatCurrency(l.rate)} • {l.pipeline_status.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  {selectedLoad && (
                    <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                      Current: {selectedLoad.origin_city}, {selectedLoad.origin_state} &rarr; {selectedLoad.dest_city}, {selectedLoad.dest_state} ({formatCurrency(selectedLoad.rate)})
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">
                      Carrier Client <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      required
                      className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company_name} ({c.client_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">Matched Broker</label>
                    <select
                      value={selectedBrokerId}
                      onChange={(e) => setSelectedBrokerId(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Select or Match Broker --</option>
                      {brokers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.company_name} (MC: {b.mc_number || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* EDITABLE EXTRACTED FIELDS & FINANCIAL CARD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left 2 Cols: Form Fields */}
              <div className="md:col-span-2 space-y-4">
                {/* Financials & Load ID */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Agreed Financial Compensation</span>
                    </div>
                    {renderConfidenceBadge(extraction.confidence_scores.rate)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-semibold">Load / Order #</label>
                      <input
                        type="text"
                        value={formFields.load_number}
                        onChange={(e) => setFormFields({ ...formFields, load_number: e.target.value })}
                        className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-semibold">Gross Rate ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formFields.rate}
                        onChange={(e) => setFormFields({ ...formFields, rate: parseFloat(e.target.value) || 0 })}
                        className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-emerald-300 font-mono font-bold tabular-nums text-xs focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-semibold">Loaded Miles</label>
                      <input
                        type="number"
                        value={formFields.loaded_miles}
                        onChange={(e) => setFormFields({ ...formFields, loaded_miles: parseFloat(e.target.value) || 0 })}
                        className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono tabular-nums text-xs focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Route: Origin & Destination */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <MapPin className="w-4 h-4 text-sky-400" />
                      <span>Route & Appointment Schedule</span>
                    </div>
                    {renderConfidenceBadge(extraction.confidence_scores.origin)}
                  </div>

                  {/* Origin */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-semibold text-sky-400">Pickup (Origin)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Origin City"
                        value={formFields.origin_city}
                        onChange={(e) => setFormFields({ ...formFields, origin_city: e.target.value })}
                        className="h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="State (e.g. TX)"
                        maxLength={2}
                        value={formFields.origin_state}
                        onChange={(e) => setFormFields({ ...formFields, origin_state: e.target.value.toUpperCase() })}
                        className="h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs uppercase focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Zip"
                        value={formFields.origin_zip}
                        onChange={(e) => setFormFields({ ...formFields, origin_zip: e.target.value })}
                        className="h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <span className="text-[10px] uppercase font-semibold text-emerald-400">Delivery (Destination)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Dest City"
                        value={formFields.dest_city}
                        onChange={(e) => setFormFields({ ...formFields, dest_city: e.target.value })}
                        className="h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="State (e.g. GA)"
                        maxLength={2}
                        value={formFields.dest_state}
                        onChange={(e) => setFormFields({ ...formFields, dest_state: e.target.value.toUpperCase() })}
                        className="h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs uppercase focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Zip"
                        value={formFields.dest_zip}
                        onChange={(e) => setFormFields({ ...formFields, dest_zip: e.target.value })}
                        className="h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Equipment, Commodity & Special Instructions */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span>Shipment Specifications & Special Instructions</span>
                    </div>
                    {renderConfidenceBadge(extraction.confidence_scores.equipment_type)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-semibold">Equipment</label>
                      <select
                        value={formFields.equipment_type}
                        onChange={(e) => setFormFields({ ...formFields, equipment_type: e.target.value as EquipmentType })}
                        className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs cursor-pointer focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      >
                        <option value="dry_van">Dry Van</option>
                        <option value="reefer">Reefer</option>
                        <option value="flatbed">Flatbed</option>
                        <option value="step_deck">Step Deck</option>
                        <option value="power_only">Power Only</option>
                        <option value="box_truck">Box Truck</option>
                        <option value="hotshot">Hotshot</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[11px] text-slate-400 font-semibold">Commodity</label>
                      <input
                        type="text"
                        value={formFields.commodity}
                        onChange={(e) => setFormFields({ ...formFields, commodity: e.target.value })}
                        className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-semibold">Special Instructions & Handling Terms</label>
                    <textarea
                      rows={2}
                      value={formFields.special_instructions}
                      onChange={(e) => setFormFields({ ...formFields, special_instructions: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs resize-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right 1 Col: Real-time Profitability & Accessorials */}
              <div className="space-y-4">
                {/* Financial Benchmark Engine */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Financial Sanity Engine</span>
                  </div>

                  <div className="space-y-2 font-mono tabular-nums text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400 font-sans">Gross Revenue</span>
                      <span className="font-bold text-emerald-300">{formatCurrency(currentProfitability.grossRate)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400 font-sans">Rate Per Mile (RPM)</span>
                      <span className="font-bold text-slate-100">{formatRPM(currentProfitability.rpm)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400 font-sans">Est. Fuel Cost</span>
                      <span className="text-slate-300">{formatCurrency(currentProfitability.fuelExpense)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400 font-sans">Est. Driver Pay</span>
                      <span className="text-slate-300">{formatCurrency(currentProfitability.driverPay)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 bg-slate-900/60 px-2 rounded-lg font-bold">
                      <span className="text-indigo-300 font-sans">Net Estimated Profit</span>
                      <span className="text-indigo-200">{formatCurrency(currentProfitability.estimatedProfit)} ({currentProfitability.profitMargin}%)</span>
                    </div>
                  </div>
                </div>

                {/* Accessorial Clauses */}
                {extraction.accessorials && extraction.accessorials.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Extracted Accessorials</span>
                    <div className="space-y-1.5">
                      {extraction.accessorials.map((acc, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px]">
                          <div className="flex justify-between font-semibold text-slate-200 font-mono tabular-nums">
                            <span className="capitalize font-sans">{acc.type.replace(/_/g, ' ')}</span>
                            {acc.amount ? <span>{formatCurrency(acc.amount)}</span> : null}
                          </div>
                          {acc.notes && <p className="text-slate-400 mt-0.5 text-[10px]">{acc.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Approval Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApplyToLoad}
                disabled={isApplying}
                className="h-9 inline-flex items-center gap-2 px-6 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isApplying
                    ? 'Applying & Auditing...'
                    : targetMode === 'new'
                    ? 'Approve & Create Load'
                    : 'Approve & Update Load'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
