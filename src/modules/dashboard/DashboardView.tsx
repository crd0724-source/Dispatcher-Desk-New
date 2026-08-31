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

  const [isLoading, setIsLoading] = useState(true);
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

    let isMounted = true;
    const fetchDashData = async () => {
      setIsLoading(true);
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

        if (!isMounted) return;

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
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDashData();
    return () => {
      isMounted = false;
    };
  }, [orgId]);

  if (isLoading) {
    return (
      <div id="dashboard-view-skeleton" className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-slate-800 rounded-md" />
            <div className="h-4 w-96 bg-slate-800/60 rounded-md" />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-36 bg-slate-800 rounded-lg" />
            <div className="h-9 w-32 bg-indigo-900/60 rounded-lg" />
          </div>
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-3.5 w-24 bg-slate-800 rounded" />
                  <div className="h-6 w-32 bg-slate-800 rounded" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-800" />
              </div>
              <div className="h-3 w-40 bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-slate-900/90 border border-slate-800/80 rounded-xl p-5" />
            <div className="h-64 bg-slate-900/90 border border-slate-800/80 rounded-xl p-5" />
          </div>
          <div className="space-y-6">
            <div className="h-72 bg-slate-900/90 border border-slate-800/80 rounded-xl p-5" />
            <div className="h-56 bg-slate-900/90 border border-slate-800/80 rounded-xl p-5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Welcome & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Dispatcher Operations Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time fleet overview and operational load pipeline for{' '}
            <span className="text-slate-200 font-semibold">{activeOrganization?.name || 'Your Fleet'}</span>.
          </p>
        </div>

        {/* Action Controls Hierarchy */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Secondary Action Group */}
          <div className="inline-flex items-center bg-slate-900/90 p-1 border border-slate-800/90 rounded-xl shadow-xs gap-1">
            <button
              id="dash-quick-pipeline-btn"
              type="button"
              onClick={() => onNavigate('pipeline')}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800/90 rounded-lg transition-colors cursor-pointer"
            >
              Pipeline
            </button>
            <button
              id="dash-quick-tracking-btn"
              type="button"
              onClick={() => onNavigate('checkcalls')}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800/90 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tracking</span>
            </button>
            <button
              id="dash-quick-tasks-btn"
              type="button"
              onClick={() => onNavigate('tasks')}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800/90 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tasks</span>
            </button>
            <button
              id="dash-quick-documents-btn"
              type="button"
              onClick={() => onNavigate('documents')}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800/90 rounded-lg transition-colors cursor-pointer"
            >
              Documents
            </button>
          </div>

          {/* Strong Secondary Navigation: Operations Calendar */}
          <button
            id="dash-quick-calendar-btn"
            type="button"
            onClick={() => onNavigate('calendar')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Operations Calendar</span>
          </button>

          {/* Dominant Primary CTA: Book New Load */}
          <button
            id="dash-new-load-btn"
            type="button"
            onClick={onNewLoadClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Book New Load</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
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
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Active Dispatches & En Route ({activeLoads.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('pipeline')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View in Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-3">
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
                <div className="divide-y divide-slate-800/60 font-sans">
                  {activeLoads.map((load) => (
                    <div
                      key={load.id}
                      onClick={() => onNavigate('pipeline')}
                      className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-sky-400 group-hover:text-sky-300 transition-colors">
                            {load.load_number}
                          </span>
                          <StatusBadge status={load.pipeline_status} type="pipeline" size="sm" />
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
                            {load.equipment_type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
                          <span className="font-semibold text-slate-100">{load.origin_city}, {load.origin_state}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="font-semibold text-slate-100">{load.dest_city}, {load.dest_state}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-mono tabular-nums text-xs sm:text-sm font-bold text-emerald-400">
                          {formatCurrency(load.rate)}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono tabular-nums">
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
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Paperwork & Invoicing Audit ({missingDocItems.length} Missing)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('documents')}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Go to Document Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-3">
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
                      className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:border-slate-700/80 transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sky-400 group-hover:text-sky-300 transition-colors">{load.load_number}</span>
                          <StatusBadge status={load.pipeline_status} type="pipeline" size="sm" />
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                          <span className="text-slate-300">{load.origin_city}, {load.origin_state}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="text-slate-300">{load.dest_city}, {load.dest_state}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end shrink-0">
                        {missingDocs.map((docType) => (
                          <span
                            key={docType}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/70 text-rose-300 border border-rose-800/50 font-mono whitespace-nowrap"
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
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3.5 border-b border-slate-800/80">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider">
                Operational Status
              </h2>
            </div>

            <div className="pt-3.5 space-y-3 text-xs">
              {/* Check Calls & Tracking Live State */}
              {trackingStats.missingRecentCheckInCount > 0 ? (
                <div
                  id="dash-missing-checkin-alert"
                  className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-rose-200 text-xs">
                          {trackingStats.missingRecentCheckInCount} Load(s) Missing Check-In
                        </p>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-900/60 text-rose-300 border border-rose-700/60 shrink-0">
                          &gt;24h stale
                        </span>
                      </div>
                      <p className="text-rose-300/80 text-[11px] mt-0.5">
                        Active dispatches lacking driver/location check-in in the past 24 hours.
                      </p>
                    </div>
                  </div>
                  <button
                    id="dash-track-missing-btn"
                    type="button"
                    onClick={() => onNavigate('checkcalls')}
                    className="px-2.5 py-1 text-[11px] font-semibold text-rose-200 bg-rose-900/70 hover:bg-rose-800 border border-rose-700/70 rounded-lg cursor-pointer shrink-0 transition-colors"
                  >
                    Track
                  </button>
                </div>
              ) : (
                <div
                  id="dash-tracking-healthy-status"
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Radio className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-200 text-xs">Live Load Tracking Active</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        All active loads have recent check-ins recorded.
                      </p>
                    </div>
                  </div>
                  <button
                    id="dash-view-tracking-healthy-btn"
                    type="button"
                    onClick={() => onNavigate('checkcalls')}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg cursor-pointer shrink-0 transition-colors"
                  >
                    View
                  </button>
                </div>
              )}

              {/* Operational Exceptions Alert if any */}
              {trackingStats.exceptionsCount > 0 && (
                <div
                  id="dash-tracking-exceptions-alert"
                  className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-start justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-amber-200 text-xs">
                        {trackingStats.exceptionsCount} Operational Exception(s)
                      </p>
                      <p className="text-amber-300/80 text-[11px] mt-0.5">
                        Active loads with breakdown, transit delay, or at-risk status.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('checkcalls')}
                    className="px-2.5 py-1 text-[11px] font-semibold text-amber-200 bg-amber-900/70 hover:bg-amber-800 border border-amber-700/70 rounded-lg cursor-pointer shrink-0 transition-colors"
                  >
                    Inspect
                  </button>
                </div>
              )}

              {docStats.pendingVerificationCount > 0 && (
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/50 flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-blue-200 text-xs">
                      {docStats.pendingVerificationCount} Document(s) Awaiting Audit
                    </p>
                    <p className="text-blue-300/80 text-[11px] mt-0.5">
                      Review carrier-submitted paperwork in Document Center.
                    </p>
                  </div>
                </div>
              )}

              {docStats.readyToInvoiceLoadsCount > 0 && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-start gap-2.5">
                  <Receipt className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-emerald-200 text-xs">
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
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Roster Snapshot
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('trucks')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400 font-medium">Carrier Clients (Fleets)</span>
                <span className="text-slate-100 font-bold font-mono tabular-nums text-sm">{clientsCount}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400 font-medium">Active Power Units</span>
                <span className="text-slate-100 font-bold font-mono tabular-nums text-sm">{availableTrucksCount}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400 font-medium">Approved Brokers</span>
                <span className="text-slate-100 font-bold font-mono tabular-nums text-sm">{brokersCount}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400 font-medium">Assigned Drivers</span>
                <span className="text-slate-100 font-bold font-mono tabular-nums text-sm">{driversCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


