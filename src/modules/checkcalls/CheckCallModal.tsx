import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { LoadWithRelations } from '../loads/loadTypes.ts';
import {
  CheckCall,
  CheckCallType,
  CheckCallOperationalStatus,
  CreateCheckCallInput,
  UpdateCheckCallInput,
  CHECK_CALL_TYPE_LABELS,
  CHECK_CALL_STATUS_LABELS,
} from './checkCallTypes.ts';
import {
  Radio,
  MapPin,
  Clock,
  Calendar,
  AlertTriangle,
  FileText,
  User,
  CheckCircle2,
} from 'lucide-react';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'ON', 'QC', 'BC', 'AB', 'MB', 'SK', // Added major Canadian provinces for trans-border loads
];

interface CheckCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  load: LoadWithRelations | null;
  initialCheckCall?: CheckCall | null;
  initialCallType?: CheckCallType;
  initialStatus?: CheckCallOperationalStatus;
  onSubmit: (data: CreateCheckCallInput | UpdateCheckCallInput) => Promise<void>;
}

export const CheckCallModal: React.FC<CheckCallModalProps> = ({
  isOpen,
  onClose,
  load,
  initialCheckCall,
  initialCallType,
  initialStatus,
  onSubmit,
}) => {
  const { profile, activeOrganization } = useAuth();

  const isEditing = Boolean(initialCheckCall);

  const [callType, setCallType] = useState<CheckCallType>(
    initialCheckCall?.call_type || initialCallType || 'en_route_delivery'
  );
  const [status, setStatus] = useState<CheckCallOperationalStatus>(
    initialCheckCall?.status || initialStatus || 'on_time'
  );
  const [locationCity, setLocationCity] = useState(initialCheckCall?.location_city || '');
  const [locationState, setLocationState] = useState(initialCheckCall?.location_state || '');
  const [etaPickup, setEtaPickup] = useState('');
  const [etaDelivery, setEtaDelivery] = useState('');
  const [notes, setNotes] = useState(initialCheckCall?.notes || '');
  const [createdBy, setCreatedBy] = useState(
    initialCheckCall?.created_by || profile?.full_name || 'Dispatcher'
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to convert ISO string to datetime-local input string (YYYY-MM-DDTHH:mm)
  const toLocalInputValue = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialCheckCall) {
        setCallType(initialCheckCall.call_type);
        setStatus(initialCheckCall.status);
        setLocationCity(initialCheckCall.location_city || '');
        setLocationState(initialCheckCall.location_state || '');
        setEtaPickup(toLocalInputValue(initialCheckCall.eta_pickup));
        setEtaDelivery(toLocalInputValue(initialCheckCall.eta_delivery));
        setNotes(initialCheckCall.notes || '');
        setCreatedBy(initialCheckCall.created_by || profile?.full_name || 'Dispatcher');
      } else {
        const resolvedCallType = initialCallType || 'en_route_delivery';
        setCallType(resolvedCallType);
        setStatus(
          initialStatus ||
          (resolvedCallType === 'delay' || resolvedCallType === 'breakdown' ? 'delayed' : 'on_time')
        );
        setLocationCity('');
        setLocationState('');
        setEtaPickup(toLocalInputValue(load?.pickup_datetime));
        setEtaDelivery(toLocalInputValue(load?.delivery_datetime));
        setNotes('');
        setCreatedBy(profile?.full_name ? `${profile.full_name} (Dispatcher)` : 'Dispatcher');
      }
      setValidationError(null);
    }
  }, [isOpen, initialCheckCall, initialCallType, initialStatus, load, profile]);

  if (!isOpen || !load) return null;

  const isException = callType === 'delay' || callType === 'breakdown' || status === 'delayed' || status === 'at_risk';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedCity = locationCity.trim();
    const trimmedState = locationState.trim().toUpperCase();
    const trimmedNotes = notes.trim();

    // Validation: paired location
    if (trimmedCity && !trimmedState) {
      setValidationError('Please specify the State corresponding to the City.');
      return;
    }
    if (trimmedState && !trimmedCity) {
      setValidationError('Please specify the City corresponding to the State.');
      return;
    }
    if (trimmedState && trimmedState.length !== 2) {
      setValidationError('State must be a 2-letter postal code (e.g. TX, IL, GA).');
      return;
    }

    // Validation: exception notes required
    if (isException && (!trimmedNotes || trimmedNotes.length < 5)) {
      setValidationError(
        'Operational exceptions (Delay / Breakdown / At-Risk) require detailed dispatcher notes explaining the cause and mitigation steps.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && initialCheckCall) {
        await onSubmit({
          call_type: callType,
          status: status,
          location_city: trimmedCity || null,
          location_state: trimmedState || null,
          eta_pickup: etaPickup ? new Date(etaPickup).toISOString() : null,
          eta_delivery: etaDelivery ? new Date(etaDelivery).toISOString() : null,
          notes: trimmedNotes || null,
        } as UpdateCheckCallInput);
      } else {
        await onSubmit({
          load_id: load.id,
          call_type: callType,
          status: status,
          location_city: trimmedCity || null,
          location_state: trimmedState || null,
          eta_pickup: etaPickup ? new Date(etaPickup).toISOString() : null,
          eta_delivery: etaDelivery ? new Date(etaDelivery).toISOString() : null,
          notes: trimmedNotes || null,
          created_by: createdBy.trim() || 'Dispatcher',
        } as CreateCheckCallInput);
      }
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred while logging check call.';
      setValidationError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      id="check-call-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Dispatch Check Call' : 'Log Dispatch Check Call'}
      subtitle={`Load ${load.load_number} • ${load.origin_city}, ${load.origin_state} → ${load.dest_city}, ${load.dest_state}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-200">
        {validationError && (
          <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800/80 text-rose-200 flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-rose-300">Validation Notice:</span>
              <p className="text-[11px] text-rose-200/90">{validationError}</p>
            </div>
          </div>
        )}

        {/* Operational Exception Alert Section */}
        {isException && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-900/60 border border-amber-700/60 text-amber-300 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-amber-300 text-xs">Operational Exception Flagged</h4>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                This check call will be flagged across the dispatch desk and pipeline view. Please provide
                thorough notes on delay reasons, updated driver status, or mechanical assistance.
              </p>
            </div>
          </div>
        )}

        {/* Form Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Check Call Type */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
              Check Call Type <span className="text-rose-400">*</span>
            </label>
            <select
              id="checkcall-type-select"
              value={callType}
              onChange={(e) => {
                const nextType = e.target.value as CheckCallType;
                setCallType(nextType);
                if (nextType === 'delay' || nextType === 'breakdown') {
                  setStatus('delayed');
                } else if (nextType === 'delivered') {
                  setStatus('completed');
                } else if (status === 'delayed') {
                  setStatus('on_time');
                }
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
              required
            >
              {Object.entries(CHECK_CALL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Operational Status */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
              Operational Status <span className="text-rose-400">*</span>
            </label>
            <select
              id="checkcall-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as CheckCallOperationalStatus)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
              required
            >
              {Object.entries(CHECK_CALL_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Location Section (City & State) */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold uppercase tracking-wider text-[10px]">
            <MapPin className="w-3 h-3" />
            <span>Driver GPS / Check-In Location (Optional)</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-slate-400 text-[10px] mb-1">City</label>
              <input
                id="checkcall-city-input"
                type="text"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="e.g. Knoxville, Dallas, Chicago"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] mb-1">State / Prov</label>
              <input
                id="checkcall-state-input"
                type="text"
                list="us-states-list"
                maxLength={2}
                value={locationState}
                onChange={(e) => setLocationState(e.target.value.toUpperCase())}
                placeholder="TN"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs uppercase focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
              <datalist id="us-states-list">
                {US_STATES.map((st) => (
                  <option key={st} value={st} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Dynamic ETAs (Pickup & Delivery) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Updated Pickup ETA</span>
            </label>
            <input
              id="checkcall-pickup-eta"
              type="datetime-local"
              value={etaPickup}
              onChange={(e) => setEtaPickup(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-teal-400" />
              <span>Updated Delivery ETA</span>
            </label>
            <input
              id="checkcall-delivery-eta"
              type="datetime-local"
              value={etaDelivery}
              onChange={(e) => setEtaDelivery(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Dispatcher Notes */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1 text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-purple-400" />
              <span>Dispatcher & Driver Log Notes {isException && <span className="text-rose-400">*</span>}</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              {isException ? 'Required for exceptions' : 'Optional details'}
            </span>
          </label>
          <textarea
            id="checkcall-notes-input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isException
                ? 'Describe the breakdown, traffic congestion, weather event, or receiver delay in detail...'
                : 'e.g. Driver called in; reefer temp verified at 36°F, passing mile marker 142 on I-40 East.'
            }
            className={`w-full px-3 py-2 bg-slate-950 border rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 ${
              isException && !notes.trim() ? 'border-amber-700/80 bg-amber-950/10' : 'border-slate-700'
            }`}
            required={isException}
          />
        </div>

        {/* Creator / Dispatcher Badge */}
        {!isEditing && (
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 text-slate-500" />
              Logged By:
            </span>
            <input
              type="text"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300 text-[11px] focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
          <button
            type="button"
            id="btn-cancel-checkcall"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            id="btn-submit-checkcall"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Logging...' : isEditing ? 'Save Changes' : 'Record Check Call'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
