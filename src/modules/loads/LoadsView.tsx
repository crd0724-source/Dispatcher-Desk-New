import React, { useState, useEffect, useCallback } from 'react';
import {
  LoadWithRelations,
  CreateLoadInput,
  UpdateLoadInput,
  LoadFilterCriteria,
} from './loadTypes.ts';
import {
  Client,
  Broker,
  Truck,
  Driver,
  PipelineStatus,
} from '../../types/domain.types.ts';
import { loadService } from './loadService.ts';
import { LoadList } from './LoadList.tsx';
import { LoadModal } from './LoadModal.tsx';
import { LoadDetailModal } from './LoadDetailModal.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { RateConExtractionModal } from '../documents/RateConExtractionModal.tsx';
import {
  PackageCheck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface LoadsViewProps {
  isModalOpenExternal?: boolean;
  onCloseModalExternal?: () => void;
}

export const LoadsView: React.FC<LoadsViewProps> = ({
  isModalOpenExternal,
  onCloseModalExternal,
}) => {
  const { activeOrganization, userRole } = useAuth();
  const orgId = activeOrganization?.id || 'demo-organization-default';

  // Data states
  const [loads, setLoads] = useState<LoadWithRelations[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [nextLoadNumber, setNextLoadNumber] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters State
  const [filters, setFilters] = useState<LoadFilterCriteria>({
    search: '',
    clientId: 'all',
    brokerId: 'all',
    equipmentType: 'all',
    status: 'all',
    dateRange: 'all',
  });

  // Modal States
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [loadToEdit, setLoadToEdit] = useState<LoadWithRelations | null>(null);
  const [isExtractionModalOpen, setIsExtractionModalOpen] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLoadForDetail, setSelectedLoadForDetail] = useState<LoadWithRelations | null>(null);

  // Delete Confirmation Modal
  const [loadToDelete, setLoadToDelete] = useState<LoadWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Feedback State
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // Role permissions
  const canEdit = userRole === 'owner_admin' || userRole === 'dispatcher' || userRole === null;
  const canDelete = userRole === 'owner_admin' || userRole === null;

  // External modal open sync
  useEffect(() => {
    if (isModalOpenExternal) {
      setLoadToEdit(null);
      setIsAddEditModalOpen(true);
    }
  }, [isModalOpenExternal]);

  const handleCloseAddEditModal = () => {
    setIsAddEditModalOpen(false);
    setLoadToEdit(null);
    if (onCloseModalExternal) {
      onCloseModalExternal();
    }
  };

  // Fetch all related entities & loads
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        fetchedLoads,
        fetchedClients,
        fetchedBrokers,
        fetchedTrucks,
        fetchedDrivers,
        generatedLoadNo,
      ] = await Promise.all([
        loadService.getLoads(orgId, filters),
        loadService.getClients(orgId),
        loadService.getBrokers(orgId),
        loadService.getTrucks(orgId),
        loadService.getDrivers(orgId),
        loadService.generateNextLoadNumber(orgId),
      ]);

      setLoads(fetchedLoads);
      setClients(fetchedClients);
      setBrokers(fetchedBrokers);
      setTrucks(fetchedTrucks);
      setDrivers(fetchedDrivers);
      setNextLoadNumber(generatedLoadNo);
    } catch (err: any) {
      console.error('Error fetching loads data:', err);
      setError(err?.message || 'Failed to retrieve dispatch load records.');
    } finally {
      setIsLoading(false);
    }
  }, [orgId, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Save (Create or Update)
  const handleSaveLoad = async (input: CreateLoadInput | UpdateLoadInput) => {
    setIsSaving(true);
    try {
      if (loadToEdit) {
        const updated = await loadService.updateLoad(orgId, loadToEdit.id, input);
        showToast(`Load ${updated.load_number} successfully updated.`);
      } else {
        const created = await loadService.createLoad(orgId, input as CreateLoadInput);
        showToast(`Load ${created.load_number} successfully created and booked.`);
      }
      handleCloseAddEditModal();
      await fetchData();
    } catch (err: any) {
      console.error('Error saving load:', err);
      showToast(err?.message || 'Failed to save load.', 'error');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Quick Status Change
  const handleStatusChange = async (loadId: string, newStatus: PipelineStatus) => {
    try {
      const updated = await loadService.updateLoadStatus(orgId, loadId, newStatus);
      setLoads((prev) => prev.map((l) => (l.id === loadId ? updated : l)));
      if (selectedLoadForDetail?.id === loadId) {
        setSelectedLoadForDetail(updated);
      }
      showToast(`Load ${updated.load_number} status updated to ${newStatus.replace('_', ' ')}.`);
    } catch (err: any) {
      console.error('Error updating status:', err);
      showToast(err?.message || 'Failed to update status.', 'error');
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!loadToDelete) return;
    setIsDeleting(true);
    try {
      await loadService.deleteLoad(orgId, loadToDelete.id);
      showToast(`Load ${loadToDelete.load_number} deleted.`);
      setLoadToDelete(null);
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting load:', err);
      showToast(err?.message || 'Failed to delete load.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="loads-management-module" className="space-y-6">
      {/* Toast Notification */}
      {feedback && (
        <div
          id="load-feedback-toast"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
              : 'bg-rose-950 text-rose-200 border-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Load Management
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-semibold">
              Live Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track and dispatch freight loads, enforce carrier-truck-driver assignment consistency, and calculate live trip margins.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              id="header-ai-ratecon-btn"
              type="button"
              onClick={() => setIsExtractionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg shadow-sm transition-all cursor-pointer border border-indigo-400/30 self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>AI Rate Con Import</span>
            </button>

            <button
              id="header-create-load-btn"
              type="button"
              onClick={() => {
                setLoadToEdit(null);
                setIsAddEditModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Book / Create Load</span>
            </button>
          </div>
        )}
      </div>

      {/* Load List Table & Filters */}
      <LoadList
        loads={loads}
        clients={clients}
        brokers={brokers}
        isLoading={isLoading}
        error={error}
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchData}
        onAddLoad={() => {
          setLoadToEdit(null);
          setIsAddEditModalOpen(true);
        }}
        onViewLoad={(load) => {
          setSelectedLoadForDetail(load);
          setIsDetailModalOpen(true);
        }}
        onEditLoad={(load) => {
          setLoadToEdit(load);
          setIsAddEditModalOpen(true);
        }}
        onDeleteLoad={(load) => setLoadToDelete(load)}
        onStatusChange={handleStatusChange}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {/* Create / Edit Load Modal */}
      <LoadModal
        isOpen={isAddEditModalOpen}
        onClose={handleCloseAddEditModal}
        onSave={handleSaveLoad}
        initialLoad={loadToEdit}
        clients={clients}
        brokers={brokers}
        trucks={trucks}
        drivers={drivers}
        nextLoadNumber={nextLoadNumber}
        isSaving={isSaving}
      />

      {/* View Load Details Modal */}
      <LoadDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedLoadForDetail(null);
        }}
        load={selectedLoadForDetail}
        onEdit={(load) => {
          setLoadToEdit(load);
          setIsAddEditModalOpen(true);
        }}
        onStatusChange={handleStatusChange}
        canEdit={canEdit}
      />

      {/* AI Rate Confirmation OCR & Assisted Load Extraction Modal */}
      <RateConExtractionModal
        isOpen={isExtractionModalOpen}
        onClose={() => setIsExtractionModalOpen(false)}
        organizationId={orgId}
        loads={loads}
        clients={clients}
        brokers={brokers}
        trucks={trucks}
        drivers={drivers}
        onExtractionApplied={async (appliedLoad) => {
          await fetchData();
          showToast(`Rate confirmation successfully applied to Load #${appliedLoad.load_number}!`);
          setSelectedLoadForDetail(appliedLoad);
          setIsDetailModalOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        id="delete-load-confirmation-modal"
        isOpen={!!loadToDelete}
        onClose={() => setLoadToDelete(null)}
        title="Delete Load Record"
        subtitle={`Confirm permanent removal of Load #${loadToDelete?.load_number}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-slate-300">
          <div className="flex items-start gap-3 p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-300">Permanent Action</p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">
                Are you sure you want to remove Load <strong>#{loadToDelete?.load_number}</strong> ({loadToDelete?.origin_city}, {loadToDelete?.origin_state} → {loadToDelete?.dest_city}, {loadToDelete?.dest_state})? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setLoadToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-delete-load-btn"
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Load'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
