import React, { useState, useEffect, useMemo } from 'react';
import {
  Client,
  Broker,
  Truck,
  Driver,
  PipelineStatus,
  EquipmentType,
} from '../../types/domain.types.ts';
import {
  LoadWithRelations,
  CreateLoadInput,
  UpdateLoadInput,
  PIPELINE_STATUS_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  US_STATES,
  isValidUsState,
} from './loadTypes.ts';
import { Modal } from '../../components/common/Modal.tsx';
import { LoadProfitabilityCard } from './LoadProfitabilityCard.tsx';
import { estimateDriverPay, estimateFuelCost, formatCurrency } from '../../lib/calculations.ts';
import {
  Building2,
  Truck as TruckIcon,
  UserCheck,
  ShieldCheck,
  MapPin,
  Calendar,
  DollarSign,
  PackageCheck,
  FileText,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Calculator,
} from 'lucide-react';

// 15-minute interval options for dispatcher schedule (00, 15, 30, 45)
export const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const value = `${hh}:${mm}`;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const label = `${value} (${displayHour}:${mm} ${period})`;
      options.push({ value, label });
    }
  }
  return options;
})();

const toLocalDateString = (d: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const snapTimeTo15Minutes = (hours: number, minutes: number): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const snappedMinutes = Math.round(minutes / 15) * 15;
  let h = hours;
  let m = snappedMinutes;
  if (m >= 60) {
    h = (h + 1) % 24;
    m = 0;
  }
  return `${pad(h)}:${pad(m)}`;
};

const parseDateAndTimeToInputs = (isoString?: string | null): { date: string; time: string } => {
  if (!isoString) return { date: '', time: '' };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: '', time: '' };
    const date = toLocalDateString(d);
    const snappedTime = snapTimeTo15Minutes(d.getHours(), d.getMinutes());
    return { date, time: snappedTime };
  } catch {
    return { date: '', time: '' };
  }
};

const constructIsoDatetime = (dateStr: string, timeStr: string): string | null => {
  if (!dateStr) return null;
  const time = timeStr || '00:00';
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (!year || !month || !day) return null;
  const dateObj = new Date(year, month - 1, day, isNaN(hour) ? 0 : hour, isNaN(minute) ? 0 : minute, 0);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString();
};

interface LoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateLoadInput | UpdateLoadInput) => Promise<void>;
  initialLoad?: LoadWithRelations | null;
  clients: Client[];
  brokers: Broker[];
  trucks: Truck[];
  drivers: Driver[];
  nextLoadNumber?: string;
  isSaving?: boolean;
}

export const LoadModal: React.FC<LoadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialLoad,
  clients,
  brokers,
  trucks,
  drivers,
  nextLoadNumber,
  isSaving = false,
}) => {
  const isEditing = !!initialLoad;

  // Form State
  const [loadNumber, setLoadNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [brokerId, setBrokerId] = useState('');
  const [truckId, setTruckId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('sourced');
  const [equipmentType, setEquipmentType] = useState<EquipmentType>('dry_van');
  const [commodity, setCommodity] = useState('');
  const [weightLbs, setWeightLbs] = useState('');

  // Origin / Pickup
  const [originCity, setOriginCity] = useState('');
  const [originState, setOriginState] = useState('TX');
  const [originZip, setOriginZip] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('08:00');

  // Destination / Delivery
  const [destCity, setDestCity] = useState('');
  const [destState, setDestState] = useState('GA');
  const [destZip, setDestZip] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('17:00');

  // Financials & Miles
  const [rate, setRate] = useState<string>('2400');
  const [loadedMiles, setLoadedMiles] = useState<string>('750');
  const [deadheadMiles, setDeadheadMiles] = useState<string>('40');
  const [fuelExpense, setFuelExpense] = useState<string>('480');
  const [driverPay, setDriverPay] = useState<string>('600');
  const [otherExpenses, setOtherExpenses] = useState<string>('50');

  const [specialInstructions, setSpecialInstructions] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset or populate on open
  useEffect(() => {
    if (!isOpen) return;

    setFormErrors({});
    setSubmitError(null);
    setIsSubmitting(false);

    if (initialLoad) {
      setLoadNumber(initialLoad.load_number);
      setClientId(initialLoad.client_id || '');
      setBrokerId(initialLoad.broker_id || '');
      setTruckId(initialLoad.truck_id || '');
      setDriverId(initialLoad.driver_id || '');
      setPipelineStatus(initialLoad.pipeline_status || 'booked');
      setEquipmentType(initialLoad.equipment_type || 'dry_van');
      setCommodity(initialLoad.commodity || '');
      setWeightLbs(initialLoad.weight_lbs ? String(initialLoad.weight_lbs) : '');

      setOriginCity(initialLoad.origin_city || '');
      setOriginState(initialLoad.origin_state || 'TX');
      setOriginZip(initialLoad.origin_zip || '');

      if (initialLoad.pickup_datetime) {
        const parsed = parseDateAndTimeToInputs(initialLoad.pickup_datetime);
        setPickupDate(parsed.date);
        setPickupTime(parsed.time || '08:00');
      } else {
        setPickupDate('');
        setPickupTime('08:00');
      }

      setDestCity(initialLoad.dest_city || '');
      setDestState(initialLoad.dest_state || 'GA');
      setDestZip(initialLoad.dest_zip || '');

      if (initialLoad.delivery_datetime) {
        const parsed = parseDateAndTimeToInputs(initialLoad.delivery_datetime);
        setDeliveryDate(parsed.date);
        setDeliveryTime(parsed.time || '17:00');
      } else {
        setDeliveryDate('');
        setDeliveryTime('17:00');
      }

      setRate(String(initialLoad.rate || 0));
      setLoadedMiles(String(initialLoad.loaded_miles || 0));
      setDeadheadMiles(String(initialLoad.deadhead_miles || 0));
      setFuelExpense(String(initialLoad.fuel_expense || 0));
      setDriverPay(String(initialLoad.driver_pay || 0));
      setOtherExpenses(String(initialLoad.other_expenses || 0));
      setSpecialInstructions(initialLoad.special_instructions || '');
    } else {
      // Default new load values
      setLoadNumber(nextLoadNumber || `LD-${new Date().getFullYear()}-8850`);
      const defaultClient = clients[0]?.id || '';
      setClientId(defaultClient);
      setBrokerId(brokers[0]?.id || '');

      // Check trucks for default client
      const clientTrucks = trucks.filter((t) => t.client_id === defaultClient);
      setTruckId(clientTrucks[0]?.id || '');

      const clientDrivers = drivers.filter((d) => d.client_id === defaultClient);
      setDriverId(clientDrivers[0]?.id || '');

      setPipelineStatus('sourced');
      setEquipmentType('dry_van');
      setCommodity('General Freight / Palletized');
      setWeightLbs('38000');

      setOriginCity('Dallas');
      setOriginState('TX');
      setOriginZip('75207');

      const tomorrow = new Date(Date.now() + 86400000);
      const dayAfter = new Date(Date.now() + 2 * 86400000);

      setPickupDate(toLocalDateString(tomorrow));
      setPickupTime('08:00');

      setDestCity('Atlanta');
      setDestState('GA');
      setDestZip('30301');
      setDeliveryDate(toLocalDateString(dayAfter));
      setDeliveryTime('17:00');

      setRate('2450');
      setLoadedMiles('780');
      setDeadheadMiles('45');
      setFuelExpense('485');
      setDriverPay('660');
      setOtherExpenses('50');
      setSpecialInstructions('');
    }
  }, [isOpen, initialLoad?.id]);

  // Available trucks strictly filtered by selected client
  const availableTrucks = useMemo(() => {
    if (!clientId) return [];
    return trucks.filter((t) => t.client_id === clientId);
  }, [trucks, clientId]);

  // Available drivers strictly filtered by selected client
  const availableDrivers = useMemo(() => {
    if (!clientId) return [];
    return drivers.filter((d) => d.client_id === clientId);
  }, [drivers, clientId]);

  // Active broker details for preview
  const selectedBroker = useMemo(() => {
    return brokers.find((b) => b.id === brokerId) || null;
  }, [brokers, brokerId]);

  // Active driver details for contract calculation
  const selectedDriver = useMemo(() => {
    return drivers.find((d) => d.id === driverId) || null;
  }, [drivers, driverId]);

  // Active client details
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === clientId) || null;
  }, [clients, clientId]);

  // When Client changes, enforce relationship integrity:
  // clear truck and driver if they do not belong to the newly selected client.
  const handleClientChange = (newClientId: string) => {
    setSubmitError(null);
    setClientId(newClientId);

    // Validate truck
    const validTrucksForNewClient = trucks.filter((t) => t.client_id === newClientId);
    if (!validTrucksForNewClient.some((t) => t.id === truckId)) {
      setTruckId(validTrucksForNewClient[0]?.id || '');
    }

    // Validate driver
    const validDriversForNewClient = drivers.filter((d) => d.client_id === newClientId);
    if (!validDriversForNewClient.some((d) => d.id === driverId)) {
      setDriverId(validDriversForNewClient[0]?.id || '');
    }
  };

  // When Truck changes, auto-suggest or link assigned driver if available
  const handleTruckChange = (newTruckId: string) => {
    setSubmitError(null);
    setTruckId(newTruckId);
    if (newTruckId) {
      const assignedDriver = availableDrivers.find((d) => (d as any).assigned_truck_id === newTruckId);
      if (assignedDriver) {
        setDriverId(assignedDriver.id);
      }
    }
  };

  // Numeric and Calculated Values
  const numericRate = Math.max(0, parseFloat(rate) || 0);
  const numericLoadedMiles = Math.max(0, parseFloat(loadedMiles) || 0);
  const numericDeadheadMiles = Math.max(0, parseFloat(deadheadMiles) || 0);
  const numericFuelExpense = Math.max(0, parseFloat(fuelExpense) || 0);
  const numericDriverPay = Math.max(0, parseFloat(driverPay) || 0);
  const numericOtherExpenses = Math.max(0, parseFloat(otherExpenses) || 0);
  const totalMiles = numericLoadedMiles + numericDeadheadMiles;

  // Auto-calculate driver pay from driver's contract terms
  const handleAutoCalculateDriverPay = () => {
    if (!selectedDriver) return;
    const computedPay = estimateDriverPay(
      selectedDriver.pay_type,
      selectedDriver.pay_rate,
      numericRate,
      numericLoadedMiles,
      numericDeadheadMiles
    );
    setDriverPay(String(computedPay));
  };

  // Auto-estimate fuel based on miles
  const handleAutoEstimateFuel = () => {
    const estimatedFuel = estimateFuelCost(totalMiles);
    setFuelExpense(String(estimatedFuel));
  };

  // Validation before submit
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!loadNumber.trim()) {
      errors.loadNumber = 'Load number is required.';
    }
    if (!clientId) {
      errors.clientId = 'Client selection is required.';
    }
    if (!originCity.trim()) {
      errors.originCity = 'Origin city is required.';
    }
    if (!originState.trim() || !isValidUsState(originState)) {
      errors.originState = 'Valid 2-letter state required.';
    }
    if (!destCity.trim()) {
      errors.destCity = 'Destination city is required.';
    }
    if (!destState.trim() || !isValidUsState(destState)) {
      errors.destState = 'Valid 2-letter state required.';
    }

    if (pickupDate && deliveryDate) {
      const pIso = constructIsoDatetime(pickupDate, pickupTime);
      const dIso = constructIsoDatetime(deliveryDate, deliveryTime);
      if (pIso && dIso && new Date(dIso).getTime() < new Date(pIso).getTime()) {
        errors.deliveryDate = 'Delivery datetime cannot be earlier than pickup datetime.';
      }
    }

    if (numericRate <= 0) {
      errors.rate = 'Gross rate must be greater than $0.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm()) return;

    const pickupDatetime = constructIsoDatetime(pickupDate, pickupTime);
    const deliveryDatetime = constructIsoDatetime(deliveryDate, deliveryTime);

    const payload: CreateLoadInput = {
      load_number: loadNumber.trim().toUpperCase(),
      client_id: clientId || null,
      broker_id: brokerId || null,
      truck_id: truckId || null,
      driver_id: driverId || null,
      pipeline_status: pipelineStatus,
      equipment_type: equipmentType,
      commodity: commodity.trim() || null,
      weight_lbs: weightLbs ? parseFloat(weightLbs) : null,
      origin_city: originCity.trim(),
      origin_state: originState.trim().toUpperCase(),
      origin_zip: originZip.trim() || null,
      pickup_datetime: pickupDatetime,
      dest_city: destCity.trim(),
      dest_state: destState.trim().toUpperCase(),
      dest_zip: destZip.trim() || null,
      delivery_datetime: deliveryDatetime,
      rate: numericRate,
      loaded_miles: numericLoadedMiles,
      deadhead_miles: numericDeadheadMiles,
      fuel_expense: numericFuelExpense,
      driver_pay: numericDriverPay,
      other_expenses: numericOtherExpenses,
      special_instructions: specialInstructions.trim() || null,
    };

    setIsSubmitting(true);
    try {
      await onSave(payload);
    } catch (err: any) {
      console.error('LoadModal save error:', err);
      setSubmitError(err?.message || 'Failed to save load. Please check assignments and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSaving || isSubmitting;

  return (
    <Modal
      id="load-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Load ${initialLoad?.load_number}` : 'Create Dispatch Load'}
      subtitle={
        isEditing
          ? 'Update dispatch assignments, rate con terms, or schedule'
          : 'Book new load with carrier assignment, broker terms, and live profitability'
      }
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-xs text-slate-200">
        {/* Error Alert Banner */}
        {submitError && (
          <div
            id="load-modal-error-banner"
            className="flex items-start gap-2.5 p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-300 text-xs">Assignment or Save Error</p>
              <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">{submitError}</p>
            </div>
          </div>
        )}

        {/* Top Header Bar: Load # & Pipeline Status */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Load Number <span className="text-rose-400">*</span>
            </label>
            <input
              id="load-number-input"
              type="text"
              required
              value={loadNumber}
              onChange={(e) => setLoadNumber(e.target.value.toUpperCase())}
              placeholder="e.g. LD-2024-8841"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-500"
            />
            {formErrors.loadNumber && (
              <p className="text-rose-400 text-[11px] mt-1">{formErrors.loadNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Pipeline Status
            </label>
            <select
              id="load-status-select"
              value={pipelineStatus}
              onChange={(e) => setPipelineStatus(e.target.value as PipelineStatus)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {PIPELINE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION 1: ASSIGNMENT (Client -> Truck -> Driver) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>1. Carrier Fleet & Unit Assignment</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Client Selection */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Client / Carrier <span className="text-rose-400">*</span>
              </label>
              <select
                id="load-client-select"
                required
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="" disabled>
                  Select Client Carrier...
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.client_type === 'owner_operator' ? 'Owner-Op' : 'Fleet'})
                  </option>
                ))}
              </select>
              {formErrors.clientId && (
                <p className="text-rose-400 text-[11px] mt-1">{formErrors.clientId}</p>
              )}
            </div>

            {/* Truck Selection (filtered by Client) */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Assigned Truck
              </label>
              <select
                id="load-truck-select"
                value={truckId}
                onChange={(e) => handleTruckChange(e.target.value)}
                disabled={!clientId}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
              >
                <option value="">(No power unit assigned)</option>
                {availableTrucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    Truck #{t.truck_number} ({t.equipment_type.replace('_', ' ')})
                  </option>
                ))}
              </select>
              {clientId && availableTrucks.length === 0 && (
                <p className="text-amber-400/80 text-[10px] mt-1">No trucks registered for this client</p>
              )}
            </div>

            {/* Driver Selection (filtered by Client) */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Assigned Driver
              </label>
              <select
                id="load-driver-select"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                disabled={!clientId}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
              >
                <option value="">(No driver assigned)</option>
                {availableDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.pay_type === 'percentage_gross' ? `${d.pay_rate}% gross` : d.pay_type === 'per_mile' ? `$${d.pay_rate}/mi` : `$${d.pay_rate} flat`})
                  </option>
                ))}
              </select>
              {clientId && availableDrivers.length === 0 && (
                <p className="text-amber-400/80 text-[10px] mt-1">No drivers registered for this client</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: BROKER */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>2. Freight Broker / Customer</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Brokerage Firm
              </label>
              <select
                id="load-broker-select"
                value={brokerId}
                onChange={(e) => setBrokerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">(No broker linked)</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.company_name} {b.mc_number ? `(MC-${b.mc_number})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Broker Contact & Credit Snapshot */}
            {selectedBroker ? (
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] flex flex-col justify-center space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{selectedBroker.company_name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                    {selectedBroker.credit_status.replace('_', ' ')} • {selectedBroker.payment_terms_days}d Net
                  </span>
                </div>
                <div className="text-slate-400 flex items-center gap-3">
                  <span>Contact: <strong className="text-slate-300">{selectedBroker.contact_name || 'Dispatch Desk'}</strong></span>
                  {selectedBroker.contact_phone && <span>{selectedBroker.contact_phone}</span>}
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-lg p-2.5 flex items-center text-slate-500 text-[11px]">
                Select a broker to inspect credit terms and contact details
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3 & 4: PICKUP & DELIVERY (LANES) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pickup */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
              <MapPin className="w-3.5 h-3.5" />
              <span>3. Shipper / Origin (Pickup)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                  City <span className="text-rose-400">*</span>
                </label>
                <input
                  id="origin-city-input"
                  type="text"
                  required
                  placeholder="e.g. Dallas"
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                {formErrors.originCity && (
                  <p className="text-rose-400 text-[10px] mt-0.5">{formErrors.originCity}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                  State <span className="text-rose-400">*</span>
                </label>
                <select
                  id="origin-state-select"
                  value={originState}
                  onChange={(e) => setOriginState(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {US_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">ZIP Code</label>
                <input
                  id="origin-zip-input"
                  type="text"
                  placeholder="75207"
                  value={originZip}
                  onChange={(e) => setOriginZip(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">Pickup Date</label>
                <input
                  id="pickup-date-input"
                  type="date"
                  value={pickupDate}
                  onChange={(e) => {
                    setPickupDate(e.target.value);
                    setSubmitError(null);
                    if (formErrors.deliveryDate) {
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.deliveryDate;
                        return next;
                      });
                    }
                  }}
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">Pickup Time</label>
                <select
                  id="pickup-time-select"
                  value={pickupTime}
                  onChange={(e) => {
                    setPickupTime(e.target.value);
                    setSubmitError(null);
                    if (formErrors.deliveryDate) {
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.deliveryDate;
                        return next;
                      });
                    }
                  }}
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {!TIME_OPTIONS.some((opt) => opt.value === pickupTime) && pickupTime && (
                    <option value={pickupTime}>{pickupTime}</option>
                  )}
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80 text-teal-400 font-bold uppercase tracking-wider text-[11px]">
              <MapPin className="w-3.5 h-3.5" />
              <span>4. Receiver / Destination (Delivery)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                  City <span className="text-rose-400">*</span>
                </label>
                <input
                  id="dest-city-input"
                  type="text"
                  required
                  placeholder="e.g. Atlanta"
                  value={destCity}
                  onChange={(e) => setDestCity(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                {formErrors.destCity && (
                  <p className="text-rose-400 text-[10px] mt-0.5">{formErrors.destCity}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">
                  State <span className="text-rose-400">*</span>
                </label>
                <select
                  id="dest-state-select"
                  value={destState}
                  onChange={(e) => setDestState(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {US_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">ZIP Code</label>
                <input
                  id="dest-zip-input"
                  type="text"
                  placeholder="30301"
                  value={destZip}
                  onChange={(e) => setDestZip(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">Delivery Date</label>
                <input
                  id="delivery-date-input"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => {
                    setDeliveryDate(e.target.value);
                    setSubmitError(null);
                    if (formErrors.deliveryDate) {
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.deliveryDate;
                        return next;
                      });
                    }
                  }}
                  className={`w-full px-2 py-1.5 bg-slate-900 border rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500 cursor-pointer ${
                    formErrors.deliveryDate ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">Delivery Time</label>
                <select
                  id="delivery-time-select"
                  value={deliveryTime}
                  onChange={(e) => {
                    setDeliveryTime(e.target.value);
                    setSubmitError(null);
                    if (formErrors.deliveryDate) {
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.deliveryDate;
                        return next;
                      });
                    }
                  }}
                  className={`w-full px-2 py-1.5 bg-slate-900 border rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500 cursor-pointer ${
                    formErrors.deliveryDate ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-700'
                  }`}
                >
                  {!TIME_OPTIONS.some((opt) => opt.value === deliveryTime) && deliveryTime && (
                    <option value={deliveryTime}>{deliveryTime}</option>
                  )}
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {formErrors.deliveryDate && (
              <p id="delivery-date-error" className="text-rose-400 text-[11px] mt-1 flex items-center gap-1.5 font-medium bg-rose-950/40 p-2 rounded-lg border border-rose-800/60 animate-in fade-in duration-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>{formErrors.deliveryDate}</span>
              </p>
            )}
          </div>
        </div>

        {/* SECTION 5: FREIGHT SPECS & MILEAGE */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
            <PackageCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>5. Freight Equipment & Odometer Specs</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Equipment</label>
              <select
                id="load-equipment-select"
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value as EquipmentType)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {EQUIPMENT_TYPE_OPTIONS.map((eq) => (
                  <option key={eq.value} value={eq.value}>
                    {eq.shortLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">Commodity / Goods</label>
              <input
                id="load-commodity-input"
                type="text"
                placeholder="e.g. Packaged Consumer Electronics"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Weight (lbs)</label>
              <input
                id="load-weight-input"
                type="number"
                min="0"
                step="100"
                placeholder="38000"
                value={weightLbs}
                onChange={(e) => setWeightLbs(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Loaded Mi</label>
                <input
                  id="load-loaded-miles-input"
                  type="number"
                  min="0"
                  value={loadedMiles}
                  onChange={(e) => setLoadedMiles(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Deadhead</label>
                <input
                  id="load-deadhead-miles-input"
                  type="number"
                  min="0"
                  value={deadheadMiles}
                  onChange={(e) => setDeadheadMiles(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 6: FINANCIAL INPUTS & LIVE PROFITABILITY */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>6. Rate & Financial Dispatch Inputs</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Total Trip Miles: <strong className="text-slate-200">{totalMiles} mi</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Gross Rate ($) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                <input
                  id="load-rate-input"
                  type="number"
                  min="0"
                  step="25"
                  required
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full pl-6 pr-2 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
              {formErrors.rate && (
                <p className="text-rose-400 text-[10px] mt-0.5">{formErrors.rate}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-medium">Fuel Expense ($)</label>
                <button
                  type="button"
                  onClick={handleAutoEstimateFuel}
                  title="Estimate fuel at 6.5 MPG @ $3.85/gal"
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  Auto
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                <input
                  id="load-fuel-expense-input"
                  type="number"
                  min="0"
                  step="10"
                  value={fuelExpense}
                  onChange={(e) => setFuelExpense(e.target.value)}
                  className="w-full pl-6 pr-2 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-medium">Driver Pay ($)</label>
                {selectedDriver && (
                  <button
                    type="button"
                    onClick={handleAutoCalculateDriverPay}
                    title="Auto-calculate driver pay from contract terms"
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Calculator className="w-2.5 h-2.5" />
                    Contract
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                <input
                  id="load-driver-pay-input"
                  type="number"
                  min="0"
                  step="10"
                  value={driverPay}
                  onChange={(e) => setDriverPay(e.target.value)}
                  className="w-full pl-6 pr-2 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Other Costs ($)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                <input
                  id="load-other-expenses-input"
                  type="number"
                  min="0"
                  step="10"
                  placeholder="Lumper / Tolls"
                  value={otherExpenses}
                  onChange={(e) => setOtherExpenses(e.target.value)}
                  className="w-full pl-6 pr-2 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Deterministic Live Profitability Preview Card */}
          <div className="pt-2">
            <LoadProfitabilityCard
              rate={numericRate}
              loadedMiles={numericLoadedMiles}
              deadheadMiles={numericDeadheadMiles}
              fuelExpense={numericFuelExpense}
              driverPay={numericDriverPay}
              otherExpenses={numericOtherExpenses}
            />
          </div>
        </div>

        {/* SECTION 7: SPECIAL INSTRUCTIONS */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>7. Special Instructions & Check Call Rules</span>
          </div>
          <textarea
            id="load-special-instructions-input"
            rows={2}
            placeholder="e.g. Check in at Gate 4 with Broker PO #123. Lock trailer with bolt seal. 4-hour check call cadence mandatory."
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 resize-none font-sans"
          />
        </div>

        {/* Footer Actions & Error Banner */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          {submitError && (
            <div
              id="load-modal-footer-error-banner"
              className="flex items-start gap-2.5 p-3.5 bg-rose-950/80 border border-rose-700 rounded-xl text-rose-200 animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-300 text-xs">Assignment or Save Error</p>
                <p className="text-[11px] text-rose-200 mt-0.5 leading-relaxed">{submitError}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="save-load-btn"
              type="submit"
              disabled={isBusy}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isBusy ? (
                <span>Saving Load...</span>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Confirm & Book Load'}</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
