import React from 'react';
import { Client } from '../../types/domain.types.ts';
import { Modal } from '../../components/common/Modal.tsx';
import { formatInTimezone, DEFAULT_OPERATIONAL_TIMEZONE } from '../../lib/timezones.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import {
  Building2,
  Mail,
  Phone,
  DollarSign,
  MapPin,
  Truck,
  Users,
  Package,
  Calendar,
  Clock,
  Edit2,
  Power,
  Trash2,
  FileText,
  ShieldAlert,
} from 'lucide-react';

interface ClientDetailModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onToggleStatus: (client: Client) => void;
  onDelete?: (client: Client) => void;
  canEdit: boolean;
  canDelete: boolean;
  isUpdatingStatus?: boolean;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  isOpen,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
  canEdit,
  canDelete,
  isUpdatingStatus = false,
}) => {
  const { activeOrganization } = useAuth();

  if (!client) return null;

  const timezone = activeOrganization?.primary_timezone || DEFAULT_OPERATIONAL_TIMEZONE;
  const isInactive = client.status === 'inactive';

  return (
    <Modal
      id={`client-detail-modal-${client.id}`}
      isOpen={isOpen}
      onClose={onClose}
      title={client.company_name}
      subtitle={`Client Account Record • ${client.client_type === 'owner_operator' ? 'Owner-Operator (Single Unit)' : 'Small Fleet'}`}
      maxWidth="2xl"
    >
      <div className="space-y-6 text-xs text-slate-300">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">{client.company_name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    isInactive
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
                      : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/60'
                  }`}
                >
                  {client.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                ID: {client.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {canEdit && (
              <>
                <button
                  id="client-detail-edit-btn"
                  onClick={() => {
                    onEdit(client);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  id="client-detail-toggle-status-btn"
                  onClick={() => onToggleStatus(client)}
                  disabled={isUpdatingStatus}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                    isInactive
                      ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/60'
                      : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-800/60'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{isInactive ? 'Reactivate' : 'Deactivate'}</span>
                </button>
              </>
            )}

            {canDelete && onDelete && (
              <button
                id="client-detail-delete-btn"
                onClick={() => onDelete(client)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 font-semibold border border-rose-800/60 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Contact & Billing */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Contact & Invoicing
            </h4>

            <div className="space-y-2">
              <div>
                <span className="text-slate-500 block text-[11px]">Primary Contact</span>
                <span className="font-medium text-slate-200">
                  {client.contact_name || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Phone</span>
                {client.contact_phone ? (
                  <a
                    href={`tel:${client.contact_phone}`}
                    className="text-indigo-400 hover:text-indigo-300 font-mono inline-flex items-center gap-1 hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    {client.contact_phone}
                  </a>
                ) : (
                  <span className="text-slate-500 font-mono">—</span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Contact Email</span>
                {client.contact_email ? (
                  <a
                    href={`mailto:${client.contact_email}`}
                    className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 hover:underline break-all"
                  >
                    <Mail className="w-3 h-3 shrink-0" />
                    {client.contact_email}
                  </a>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Billing / Factoring Email</span>
                {client.billing_email ? (
                  <a
                    href={`mailto:${client.billing_email}`}
                    className="text-slate-200 hover:text-indigo-300 inline-flex items-center gap-1 hover:underline break-all font-mono"
                  >
                    <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                    {client.billing_email}
                  </a>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Dispatch & Rate Preferences */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
              <Truck className="w-3.5 h-3.5 text-indigo-400" />
              Dispatch Operational Targets
            </h4>

            <div className="space-y-2">
              <div>
                <span className="text-slate-500 block text-[11px]">Target Minimum RPM</span>
                {client.minimum_rate_per_mile !== null && client.minimum_rate_per_mile !== undefined ? (
                  <span className="font-mono text-emerald-400 font-bold text-sm">
                    ${client.minimum_rate_per_mile.toFixed(2)} / mile
                  </span>
                ) : (
                  <span className="text-slate-500 font-mono">No target set</span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Preferred Equipment</span>
                <span className="text-slate-200">
                  {client.preferred_equipment || 'Any standard equipment'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Preferred Regional Lanes</span>
                <span className="text-slate-200">
                  {client.preferred_lanes || 'Any regional / OTR'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Account Type</span>
                <span className="text-slate-200 capitalize font-medium">
                  {client.client_type === 'owner_operator' ? 'Owner-Operator' : 'Small Fleet'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dispatcher Notes */}
        {client.notes && (
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Dispatcher Operational Notes
            </h4>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {client.notes}
            </p>
          </div>
        )}

        {/* Phase 2 Relational Structural Placeholders (Explicitly Not Mock Data) */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Associated Fleet Entities & Operations
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Trucks Section */}
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <Truck className="w-4 h-4 text-slate-500" />
                <span>Assigned Trucks</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Fleet & power units roster connects in <span className="text-indigo-400 font-semibold">Phase 2B</span>
              </div>
            </div>

            {/* Drivers Section */}
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <Users className="w-4 h-4 text-slate-500" />
                <span>Assigned Drivers</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Driver rosters & pay structures connect in <span className="text-indigo-400 font-semibold">Phase 2C</span>
              </div>
            </div>

            {/* Loads Section */}
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <Package className="w-4 h-4 text-slate-500" />
                <span>Dispatched Loads</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Load pipeline & rate history connect in <span className="text-indigo-400 font-semibold">Phase 2D</span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Timestamps */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Created: {formatInTimezone(client.created_at, timezone)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Last Updated: {formatInTimezone(client.updated_at, timezone)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
