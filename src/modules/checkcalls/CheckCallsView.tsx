import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { checkCallService } from './checkCallService.ts';
import { loadService } from '../loads/loadService.ts';
import {
  CheckCall,
  CheckCallWithRelations,
  CheckCallFilters,
  CheckCallType,
  CheckCallOperationalStatus,
  CreateCheckCallInput,
  UpdateCheckCallInput,
  TrackingStats,
  CHECK_CALL_TYPE_LABELS,
  CHECK_CALL_STATUS_LABELS,
  isOperationalException,
} from './checkCallTypes.ts';
import { LoadWithRelations } from '../loads/loadTypes.ts';
import { CheckCallList } from './CheckCallList.tsx';
import { CheckCallModal } from './CheckCallModal.tsx';
import { LoadDetailModal } from '../loads/LoadDetailModal.tsx';
import { ContextualCopilotModal } from '../ai/ContextualCopilotModal.tsx';
import { MetricCard } from '../../components/common/MetricCard.tsx';
import { TaskModal } from '../tasks/TaskModal.tsx';
import { TaskCategory, TaskPriority, DispatcherTask } from '../tasks/taskTypes.ts';
import {
  Radio,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Truck,
  RefreshCw,
  SlidersHorizontal,
  X,
  Eye,
  ShieldAlert,
  Sparkles,
  Bell,
  CheckSquare,
} from 'lucide-react';

export const CheckCallsView: React.FC = () => {
  const { activeOrganization, userRole } = useAuth();
  const orgId = activeOrganization?.id || '';

  const canEdit = userRole === 'owner_admin' || userRole === 'dispatcher';

  const [checkCalls, setCheckCalls] = useState<CheckCallWithRelations[]>([]);
  const [allLoads, setAllLoads] = useState<LoadWithRelations[]>([]);
  const [stats, setStats] = useState<TrackingStats>({
    totalCheckCalls: 0,
    activeLoadsTrackingCount: 0,
    onTimeCount: 0,
    delayedCount: 0,
    atRiskCount: 0,
    exceptionsCount: 0,
    missingRecentCheckInCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCallType, setSelectedCallType] = useState<CheckCallType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<CheckCallOperationalStatus | 'all'>('all');
  const [onlyExceptions, setOnlyExceptions] = useState(false);

  // Modals state
  const [isCheckCallModalOpen, setIsCheckCallModalOpen] = useState(false);
  const [selectedCheckCallForEdit, setSelectedCheckCallForEdit] = useState<CheckCallWithRelations | null>(null);
  const [selectedLoadForModal, setSelectedLoadForModal] = useState<LoadWithRelations | null>(null);
  const [isLoadDetailOpen, setIsLoadDetailOpen] = useState(false);
  const [selectedLoadForDetail, setSelectedLoadForDetail] = useState<LoadWithRelations | null>(null);

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskPreselectedLoadId, setTaskPreselectedLoadId] = useState<string | null>(null);
  const [taskInitialCategory, setTaskInitialCategory] = useState<TaskCategory>('check_call');
  const [taskInitialPriority, setTaskInitialPriority] = useState<TaskPriority>('normal');
  const [taskInitialTitle, setTaskInitialTitle] = useState<string>('');
  const [taskInitialDescription, setTaskInitialDescription] = useState<string>('');
  const [taskTriggerSource, setTaskTriggerSource] = useState<string>('manual');
  const [taskReferenceEntityId, setTaskReferenceEntityId] = useState<string | null>(null);

  // Copilot State
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotLoadId, setCopilotLoadId] = useState<string | undefined>(undefined);

  const fetchTrackingData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const filters: CheckCallFilters = {
        search: searchQuery,
        callType: selectedCallType,
        status: selectedStatus,
        hasException: onlyExceptions,
      };

      const [callsData, loadsData, statsData] = await Promise.all([
        checkCallService.getCheckCallsWithRelations(orgId, undefined, filters),
        loadService.getLoads(orgId),
        checkCallService.getTrackingStats(orgId),
      ]);

      setCheckCalls(callsData);
      setAllLoads(loadsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching check calls:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, searchQuery, selectedCallType, selectedStatus, onlyExceptions]);

  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  const handleOpenNewCheckCall = () => {
    // Default to first active load if available
    const activeLoad = allLoads.find(
      (l) => l.pipeline_status === 'booked' || l.pipeline_status === 'in_transit'
    ) || allLoads[0] || null;

    setSelectedLoadForModal(activeLoad);
    setSelectedCheckCallForEdit(null);
    setIsCheckCallModalOpen(true);
  };

  const handleEditCheckCall = (call: CheckCallWithRelations) => {
    const matchedLoad = allLoads.find((l) => l.id === call.load_id) || call.load || null;
    setSelectedLoadForModal(matchedLoad);
    setSelectedCheckCallForEdit(call);
    setIsCheckCallModalOpen(true);
  };

  const handleDeleteCheckCall = async (call: CheckCallWithRelations) => {
    if (!orgId) return;
    try {
      await checkCallService.deleteCheckCall(orgId, call.id);
      await fetchTrackingData();
    } catch (err) {
      console.error('Error deleting check call:', err);
    }
  };

  const handleSubmitCheckCall = async (data: CreateCheckCallInput | UpdateCheckCallInput) => {
    if (!orgId) return;
    if (selectedCheckCallForEdit) {
      await checkCallService.updateCheckCall(orgId, selectedCheckCallForEdit.id, data as UpdateCheckCallInput);
    } else {
      await checkCallService.createCheckCall(orgId, data as CreateCheckCallInput);
    }
    await fetchTrackingData();
    setIsCheckCallModalOpen(false);
  };

  const handleOpenLoadDetail = async (loadId: string) => {
    const found = allLoads.find((l) => l.id === loadId);
    if (found) {
      setSelectedLoadForDetail(found);
      setIsLoadDetailOpen(true);
    }
  };

  const handleCreateStaleCheckCallTask = () => {
    // Find active load missing check-in if possible
    const targetLoad = allLoads.find((l) => l.pipeline_status === 'in_transit') || allLoads[0] || null;
    setTaskPreselectedLoadId(targetLoad ? targetLoad.id : null);
    setTaskInitialCategory('check_call');
    setTaskInitialPriority('high');
    setTaskInitialTitle(
      targetLoad
        ? `Request Urgent GPS / Status Check-In from Driver for Load #${targetLoad.load_number}`
        : 'Conduct Routine Check-in for Active In-Flight Fleet'
    );
    setTaskInitialDescription(
      'Active transit record exceeds 24-hour update threshold without fresh GPS ping or arrival status. Contact assigned driver and record milestone.'
    );
    setTaskTriggerSource('check_call_exception');
    setTaskReferenceEntityId(null);
    setIsTaskModalOpen(true);
  };

  const handleCreateTaskFromCheckCall = (call: CheckCallWithRelations) => {
    const isException = isOperationalException(call.call_type, call.status);
    const loadNum = call.load?.load_number || 'Transit Load';
    const typeLabel = CHECK_CALL_TYPE_LABELS[call.call_type] || call.call_type;

    setTaskPreselectedLoadId(call.load_id);
    setTaskInitialCategory('check_call');
    setTaskInitialPriority(isException ? 'urgent' : 'high');
    setTaskInitialTitle(
      isException
        ? `Resolve ${typeLabel} Exception on Load #${loadNum}`
        : `Follow up on Driver Update for Load #${loadNum}`
    );
    setTaskInitialDescription(
      call.notes
        ? `[Reported ${call.status.toUpperCase()}]: ${call.notes}`
        : `Operational follow-up required following ${typeLabel} check-in milestone.`
    );
    setTaskTriggerSource('check_call_exception');
    setTaskReferenceEntityId(call.id);
    setIsTaskModalOpen(true);
  };

  const activeInFlightLoads = allLoads.filter(
    (l) => l.pipeline_status === 'booked' || l.pipeline_status === 'in_transit'
  );

  return (
    <div id="check-calls-view" className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Load Tracking & Dispatch Check Calls
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time en route status, driver location timestamps, and operational exception tracking for{' '}
            <span className="text-slate-200 font-semibold">{activeOrganization?.name || 'Your Fleet'}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-copilot-tracking-risk"
            type="button"
            onClick={() => {
              setCopilotLoadId(undefined);
              setIsCopilotOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-950/80 hover:bg-violet-900 text-violet-300 border border-violet-800/60 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Generate AI Dispatch Tracking Risk & Exception Analysis"
          >
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>AI Risk Analysis</span>
          </button>

          <button
            type="button"
            onClick={() => fetchTrackingData()}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Refresh Tracking Feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {canEdit && (
            <button
              id="btn-log-new-checkcall"
              type="button"
              onClick={handleOpenNewCheckCall}
              disabled={allLoads.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Log Check Call</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          id="metric-active-tracking"
          title="Active In-Flight Tracking"
          value={stats.activeLoadsTrackingCount.toString()}
          subtitle="Loads currently Booked or In Transit"
          icon={Truck}
          accentColor="purple"
        />
        <MetricCard
          id="metric-on-time"
          title="On-Time Status"
          value={stats.onTimeCount.toString()}
          subtitle={`${stats.delayedCount} delayed • ${stats.atRiskCount} at risk`}
          icon={CheckCircle2}
          accentColor="emerald"
        />
        <MetricCard
          id="metric-exceptions"
          title="Operational Exceptions"
          value={stats.exceptionsCount.toString()}
          subtitle="Delays & mechanical breakdowns"
          icon={AlertTriangle}
          accentColor="amber"
        />
        <MetricCard
          id="metric-missing-checkins"
          title="Missing Recent Check-In"
          value={stats.missingRecentCheckInCount.toString()}
          subtitle="Active loads with no update in 24h"
          icon={Clock}
          accentColor="amber"
        />
      </div>

      {/* Missing Check-In Warning Banner if any */}
      {stats.missingRecentCheckInCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-900/60 border border-amber-700/60 text-amber-300 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-300 text-xs sm:text-sm">
                {stats.missingRecentCheckInCount} Active Load(s) Missing Recent Check-In (&gt;24h)
              </h4>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Contact assigned drivers to confirm current GPS location, route progress, and updated delivery appointment ETAs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {canEdit && (
              <button
                type="button"
                id="btn-create-stale-checkin-task"
                onClick={handleCreateStaleCheckCallTask}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Create Follow-up Task</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setCopilotLoadId(undefined);
                setIsCopilotOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-900/80 hover:bg-amber-800 text-amber-100 border border-amber-700/60 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Analyze Stale Status</span>
            </button>
          </div>
        </div>
      )}

      {/* Active In-Flight Quick Dispatch Bar */}
      {activeInFlightLoads.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-400" />
              Active In-Flight Loads ({activeInFlightLoads.length})
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Quick Dispatch Actions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeInFlightLoads.map((load) => (
              <div
                key={load.id}
                className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenLoadDetail(load.id)}
                      className="font-mono font-bold text-sky-400 hover:text-sky-300 text-xs cursor-pointer truncate"
                    >
                      {load.load_number}
                    </button>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase font-mono">
                      {load.pipeline_status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">
                    {load.origin_city}, {load.origin_state} &rarr; {load.dest_city}, {load.dest_state}
                  </p>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLoadForModal(load);
                      setSelectedCheckCallForEdit(null);
                      setIsCheckCallModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/50 text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    + Check-In
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Controls & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by load #, city, state, dispatcher, notes..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
            />
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setOnlyExceptions(false);
                setSelectedCallType('all');
                setSelectedStatus('all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                !onlyExceptions && selectedCallType === 'all' && selectedStatus === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Records
            </button>

            <button
              type="button"
              onClick={() => {
                setOnlyExceptions(true);
                setSelectedStatus('all');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                onlyExceptions
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Exceptions Only</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedStatus(selectedStatus === 'delayed' ? 'all' : 'delayed');
                setOnlyExceptions(false);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedStatus === 'delayed'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Delayed Only
            </button>
          </div>
        </div>

        {/* Dropdown filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">
              Check Call Type
            </label>
            <select
              value={selectedCallType}
              onChange={(e) => setSelectedCallType(e.target.value as CheckCallType | 'all')}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Check Call Types</option>
              {Object.entries(CHECK_CALL_TYPE_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>
                  {lbl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">
              Operational Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as CheckCallOperationalStatus | 'all')}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Operational Statuses</option>
              {Object.entries(CHECK_CALL_STATUS_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>
                  {lbl}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Check Calls List Feed */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
          <span>Loading dispatch tracking feed...</span>
        </div>
      ) : (
        <CheckCallList
          checkCalls={checkCalls}
          canEdit={canEdit}
          onViewLoad={handleOpenLoadDetail}
          onEdit={handleEditCheckCall}
          onDelete={handleDeleteCheckCall}
          onCreateTask={handleCreateTaskFromCheckCall}
        />
      )}

      {/* Modals */}
      <CheckCallModal
        isOpen={isCheckCallModalOpen}
        onClose={() => setIsCheckCallModalOpen(false)}
        load={selectedLoadForModal}
        initialCheckCall={selectedCheckCallForEdit}
        onSubmit={handleSubmitCheckCall}
      />

      <LoadDetailModal
        isOpen={isLoadDetailOpen}
        onClose={() => {
          setIsLoadDetailOpen(false);
          setSelectedLoadForDetail(null);
        }}
        load={selectedLoadForDetail}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskPreselectedLoadId(null);
          setTaskReferenceEntityId(null);
        }}
        preselectedLoadId={taskPreselectedLoadId}
        initialCategory={taskInitialCategory}
        initialPriority={taskInitialPriority}
        initialTitle={taskInitialTitle}
        initialDescription={taskInitialDescription}
        triggerSource={taskTriggerSource}
        referenceEntityId={taskReferenceEntityId}
        onSuccess={() => {
          setIsTaskModalOpen(false);
          setTaskPreselectedLoadId(null);
          setTaskReferenceEntityId(null);
          fetchTrackingData();
        }}
      />

      <ContextualCopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        loadId={copilotLoadId}
        initialAction="explain_load_risk"
        titleContext="Dispatch Tracking & Exception Risk"
        onOpenLoadDetail={(loadIdentifier: string | LoadWithRelations) => {
          setIsCopilotOpen(false);
          if (typeof loadIdentifier === 'string') {
            const found = allLoads.find(
              (l) => l.id === loadIdentifier || l.load_number === loadIdentifier
            );
            if (found) {
              setSelectedLoadForDetail(found);
              setIsLoadDetailOpen(true);
            }
          } else if (loadIdentifier) {
            setSelectedLoadForDetail(loadIdentifier);
            setIsLoadDetailOpen(true);
          }
        }}
      />
    </div>
  );
};
