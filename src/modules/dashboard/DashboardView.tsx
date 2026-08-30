import React, { useState, useEffect } from 'react';
import {
  Truck,
  PackageCheck,
  DollarSign,
  AlertTriangle,
  FileWarning,
  Plus,
  ArrowRight,
  TrendingUp,
  MapPin,
  Calendar,
  FileText,
  FileCheck,
  Receipt,
  CheckCircle2,
  Radio,
  AlertCircle,
  Clock,
  CheckSquare,
} from 'lucide-react';
import { MetricCard } from '../../components/common/MetricCard.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { NavModule } from '../../components/layout/Sidebar.tsx';
import { loadService } from '../loads/loadService.ts';
import { documentService } from '../documents/documentService.ts';
import { checkCallService } from '../checkcalls/checkCallService.ts';
import { LoadWithRelations } from '../loads/loadTypes.ts';
import { DocumentStats, LoadDocumentSummary } from '../documents/documentTypes.ts';
import { TrackingStats } from '../checkcalls/checkCallTypes.ts';
import { formatCurrency, formatRPM } from '../../lib/calculations.ts';

interface DashboardViewProps {
  onNavigate: (module: NavModule) => void;
  onNewLoadClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onNewLoadClick }) => {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id || '';

  const [activeLoads, setActiveLoads] = useState<LoadWithRelations[]>([]);
  const [totalLoadsCount, setTotalLoadsCount] = useState(0);
  const [activeLoadsCount, setActiveLoadsCount] = useState(0);
  const [grossRevenue, setGrossRevenue] = useState(0);
  const [avgRpm, setAvgRpm] = useState(0);
  const [trucksCount, setTrucksCount] = useState(0);
  const [availableTrucksCount, setAvailableTrucksCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);
  const [brokersCount, setBrokersCount] = useState(0);
  const [driversCount, setDriversCount] = useState(0);

  const [docStats, setDocStats] = useState<DocumentStats>({
    totalDocuments: 0,
    pendingVerificationCount: 0,
    verifiedCount: 0,
    receivedCount: 0,
    missingRateConsCount: 0,
    missingPODsCount: 0,
    readyToInvoiceLoadsCount: 0,
  });

  const [missingDocItems, setMissingDocItems] = useState<
    { load: LoadWithRelations; missingDocs: string[]; summary: LoadDocumentSummary }[]
  >([]);

  const [trackingStats, setTrackingStats] = useState<TrackingStats>({
    totalCheckCalls: 0,
    activeLoadsTrackingCount: 0,
    onTimeCount: 0,
    delayedCount: 0,
    atRiskCount: 0,
    exceptionsCount: 0,
    missingRecentCheckInCount: 0,
  });

  const [missingCheckInLoads, setMissingCheckInLoads] = useState<LoadWithRelations[]>([]);

  useEffect(() => {
    if (!orgId) return;

    const fetchDashData = async () => {
      try {
        const [allLoads, [trucks, drivers, clients, brokers], dStats, missingDocs, tStats, missingCheckIns] =
          await Promise.all([
            loadService.getLoads(orgId),
            loadService.getDependencies(orgId),
            documentService.getDocumentStats(orgId),
            documentService.getMissingDocuments(orgId),
            checkCallService.getTrackingStats(orgId),
            checkCallService.getLoadsMissingRecentCheckIn(orgId),
          ]);

        setTotalLoadsCount(allLoads.length);
        const inFlight = allLoads.filter(
          (l: LoadWithRelations) => l.pipeline_status === 'booked' || l.pipeline_status === 'in_transit'
        );
        setActiveLoads(inFlight);
        setActiveLoadsCount(inFlight.length);

        const gross = allLoads.reduce((sum: number, l: LoadWithRelations) => sum + Number(l.rate || 0), 0);
        const loadedMiles = allLoads.reduce((sum: number, l: LoadWithRelations) => sum + Number(l.loaded_miles || 0), 0);
        setGrossRevenue(gross);
        setAvgRpm(loadedMiles > 0 ? gross / loadedMiles : 0);

        setTrucksCount(trucks.length);
        setAvailableTrucksCount(trucks.filter((t) => t.status === 'active').length);
        setClientsCount(clients.length);
        setBrokersCount(brokers.length);
        setDriversCount(drivers.length);
        setDocStats(dStats);
        setMissingDocItems(missingDocs as unknown as { load: LoadWithRelations; missingDocs: string[]; summary: LoadDocumentSummary }[]);
        setTrackingStats(tStats);
        setMissingCheckInLoads(missingCheckIns);
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      }
    };

    fetchDashData();
  }, [orgId]);

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Welcome & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Dispatcher Operations Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time fleet overview and operational load pipeline for{' '}
            <span className="text-slate-200 font-semibold">{activeOrganization?.name || 'Your Fleet'}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            id="dash-quick-calendar-btn"
            onClick={() => onNavigate('calendar')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 border border-indigo-400/30"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
            <span>Operations Calendar</span>
          </button>
          <button
            id="dash-quick-pipeline-btn"
            onClick={() => onNavigate('pipeline')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Open Pipeline
          </button>
          <button
            id="dash-quick-tracking-btn"
            onClick={() => onNavigate('checkcalls')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span>Load Tracking</span>
          </button>
          <button
            id="dash-quick-tasks-btn"
            onClick={() => onNavigate('tasks')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tasks</span>
          </button>
          <button
            id="dash-quick-documents-btn"
            onClick={() => onNavigate('documents')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Document Center
          </button>
          <button
            id="dash-new-load-btn"
            onClick={onNewLoadClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book New Load</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          id="metric-active-loads"
          title="Active Dispatches"
          value={activeLoadsCount.toString()}
          subtitle="Loads currently Booked or In Transit"
          icon={PackageCheck}
          accentColor="purple"
        />
        <MetricCard
          id="metric-trucks-available"
          title="Fleet Capacity"
          value={`${availableTrucksCount} / ${trucksCount}`}
          subtitle="Active trucks available in roster"
          icon={Truck}
          accentColor="blue"
        />
        <MetricCard
          id="metric-weekly-revenue"
          title="Gross Booked"
          value={formatCurrency(grossRevenue)}
          subtitle={`Avg RPM: ${formatRPM(avgRpm)}`}
          icon={DollarSign}
          accentColor="emerald"
        />
        <MetricCard
          id="metric-missing-docs"
          title="Pending / Missing Docs"
          value={(docStats.pendingVerificationCount + docStats.missingRateConsCount + docStats.missingPODsCount).toString()}
          subtitle={`${docStats.missingPODsCount} missing PODs • ${docStats.readyToInvoiceLoadsCount} ready to bill`}
          icon={FileWarning}
          accentColor="amber"
        />
      </div>

      {/* Operational Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Loads Pipeline & Paperwork Attention */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Loads Section */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Active Dispatches & En Route ({activeLoads.length})
                </h2>
              </div>
              <button
                onClick={() => onNavigate('pipeline')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                View in Pipeline <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-4">
              {activeLoads.length === 0 ? (
                <EmptyState
                  id="empty-dash-loads"
                  icon={PackageCheck}
                  title="No Active Dispatches in Progress"
                  description="When you book loads for your owner-operators and fleet clients, active pickups and en-route tracking will appear here."
                  actionLabel="Dispatch First Load"
                  onAction={onNewLoadClick}
                />
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {activeLoads.map((load) => (
                    <div
                      key={load.id}
                      onClick={() => onNavigate('pipeline')}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-slate-800/30 px-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-sky-400">
                            {load.load_number}
                          </span>
                          <StatusBadge status={load.pipeline_status} type="pipeline" size="sm" />
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {load.equipment_type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium">
                          {load.origin_city}, {load.origin_state} &rarr; {load.dest_city}, {load.dest_state}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-mono text-xs font-bold text-emerald-400">
                          {formatCurrency(load.rate)}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {load.loaded_miles || 0} mi
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Paperwork & Audit Attention */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-sky-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Paperwork & Invoicing Audit ({missingDocItems.length} Missing)
                </h2>
              </div>
              <button
                onClick={() => onNavigate('documents')}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                Go to Document Center <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-4">
              {missingDocItems.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-xs text-slate-300">
                    All active loads have verified rate confirmations and delivery paperwork on file!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {missingDocItems.slice(0, 4).map(({ load, missingDocs }) => (
                    <div
                      key={load.id}
                      onClick={() => onNavigate('documents')}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-400">{load.load_number}</span>
                          <StatusBadge status={load.pipeline_status} type="pipeline" size="sm" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {load.origin_city}, {load.origin_state} &rarr; {load.dest_city}, {load.dest_state}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 justify-end">
                        {missingDocs.map((docType) => (
                          <span
                            key={docType}
                            className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-mono"
                          >
                            Missing {docType.replace('_', ' ').toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Urgent Operational Alerts & Fleet Status */}
        <div className="space-y-6">
          {/* Operational Alerts */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Operational Status
              </h2>
            </div>

            <div className="pt-4 space-y-3 text-xs">
              {/* Check Calls & Tracking Live State */}
              {trackingStats.missingRecentCheckInCount > 0 ? (
                <div
                  id="dash-missing-checkin-alert"
                  className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-start justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-rose-200">
                          {trackingStats.missingRecentCheckInCount} Load(s) Missing Recent Check-In
                        </p>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-900/60 text-rose-300 border border-rose-700/60">
                          &gt;24h stale
                        </span>
                      </div>
                      <p className="text-rose-300/80 text-[11px] mt-1">
                        Active dispatches lacking driver/location check-in in the past 24 hours.
                      </p>
                    </div>
                  </div>
                  <button
                    id="dash-track-missing-btn"
                    onClick={() => onNavigate('checkcalls')}
                    className="px-2.5 py-1 text-[11px] font-semibold text-rose-200 bg-rose-900/70 hover:bg-rose-800 border border-rose-700/70 rounded cursor-pointer shrink-0 transition-colors"
                  >
                    Track
                  </button>
                </div>
              ) : (
                <div
                  id="dash-tracking-healthy-status"
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <Radio className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-200">Live Load Tracking Active</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        All active loads have recent check-ins.
                      </p>
                    </div>
                  </div>
                  <button
                    id="dash-view-tracking-healthy-btn"
                    onClick={() => onNavigate('checkcalls')}
                    className="px-2 py-0.5 text-[10px] font-medium text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded cursor-pointer shrink-0 transition-colors"
                  >
                    View
                  </button>
                </div>
              )}

              {/* Operational Exceptions Alert if any */}
              {trackingStats.exceptionsCount > 0 && (
                <div
                  id="dash-tracking-exceptions-alert"
                  className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-start justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-amber-200">
                        {trackingStats.exceptionsCount} Operational Exception(s)
                      </p>
                      <p className="text-amber-300/80 text-[11px] mt-0.5">
                        Active loads with breakdown, transit delay, or at-risk status.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('checkcalls')}
                    className="px-2.5 py-1 text-[11px] font-semibold text-amber-200 bg-amber-900/70 hover:bg-amber-800 border border-amber-700/70 rounded cursor-pointer shrink-0 transition-colors"
                  >
                    Inspect
                  </button>
                </div>
              )}

              {docStats.pendingVerificationCount > 0 && (
                <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/50 flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-200">
                      {docStats.pendingVerificationCount} Document(s) Awaiting Audit
                    </p>
                    <p className="text-blue-300/80 text-[11px] mt-0.5">
                      Review carrier-submitted paperwork in Document Center.
                    </p>
                  </div>
                </div>
              )}

              {docStats.readyToInvoiceLoadsCount > 0 && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 flex items-start gap-2.5">
                  <Receipt className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-200">
                      {docStats.readyToInvoiceLoadsCount} Load(s) Ready for Invoicing
                    </p>
                    <p className="text-emerald-300/80 text-[11px] mt-0.5">
                      Delivered loads with clean rate con, signed BOL, and stamped POD.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Carrier Client & Truck Summary */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Roster Snapshot
                </h2>
              </div>
              <button
                onClick={() => onNavigate('trucks')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Manage
              </button>
            </div>

            <div className="pt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Carrier Clients (Owner-Ops/Fleets)</span>
                <span className="text-slate-200 font-bold font-mono">{clientsCount}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Active Trucks</span>
                <span className="text-slate-200 font-bold font-mono">{availableTrucksCount}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Approved Brokers</span>
                <span className="text-slate-200 font-bold font-mono">{brokersCount}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400">Assigned Drivers</span>
                <span className="text-slate-200 font-bold font-mono">{driversCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

