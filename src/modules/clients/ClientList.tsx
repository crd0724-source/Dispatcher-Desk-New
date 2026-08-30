import React, { useState } from 'react';
import { Client } from '../../types/domain.types.ts';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { formatInTimezone, DEFAULT_OPERATIONAL_TIMEZONE } from '../../lib/timezones.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import {
  Search,
  Filter,
  Users,
  Eye,
  Edit2,
  Power,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

interface ClientListProps {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onViewDetails: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onToggleStatus: (client: Client) => void;
  onDeleteClient?: (client: Client) => void;
  onAddClient: () => void;
  canEdit: boolean;
  canDelete: boolean;
  togglingClientId?: string | null;
}

export const ClientList: React.FC<ClientListProps> = ({
  clients,
  isLoading,
  error,
  onRefresh,
  onViewDetails,
  onEditClient,
  onToggleStatus,
  onDeleteClient,
  onAddClient,
  canEdit,
  canDelete,
  togglingClientId,
}) => {
  const { activeOrganization } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const timezone = activeOrganization?.primary_timezone || DEFAULT_OPERATIONAL_TIMEZONE;

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.company_name.toLowerCase().includes(q) ||
      (c.contact_name && c.contact_name.toLowerCase().includes(q)) ||
      (c.contact_email && c.contact_email.toLowerCase().includes(q)) ||
      (c.contact_phone && c.contact_phone.toLowerCase().includes(q)) ||
      (c.preferred_lanes && c.preferred_lanes.toLowerCase().includes(q)) ||
      (c.preferred_equipment && c.preferred_equipment.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesType = typeFilter === 'all' || c.client_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || typeFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  return (
    <div id="clients-list-container" className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="clients-search-input"
            type="text"
            placeholder="Search company, contact, phone, email, lanes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-[11px] text-slate-400 font-medium">Status:</span>
            <select
              id="clients-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="text-xs bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Statuses</option>
              <option value="active" className="bg-slate-900 text-slate-200">Active Only</option>
              <option value="inactive" className="bg-slate-900 text-slate-200">Inactive Only</option>
            </select>
          </div>

          {/* Client Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="clients-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Account Types</option>
              <option value="owner_operator" className="bg-slate-900 text-slate-200">Owner-Operators</option>
              <option value="fleet" className="bg-slate-900 text-slate-200">Small Fleets</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            id="clients-refresh-btn"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh clients list"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Refresh client list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          id="clients-error-banner"
          className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl flex items-center justify-between text-rose-200 text-xs"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={onRefresh}
            className="px-3 py-1 bg-rose-900 hover:bg-rose-800 text-rose-100 font-semibold rounded-md transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && clients.length === 0 && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 mb-3 animate-pulse">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-300 font-medium">Loading carrier clients from database...</p>
          <p className="text-[11px] text-slate-500 mt-1">Verifying organization tenant security</p>
        </div>
      )}

      {/* Main Table or Empty State */}
      {!isLoading && clients.length === 0 && !error && (
        <EmptyState
          id="empty-clients-state"
          icon={Users}
          title="No Carrier Clients Registered Yet"
          description="Register the owner-operators and small fleets your dispatch organization manages. Set their equipment preferences, target lanes, and minimum target rates."
          actionLabel={canEdit ? 'Add First Carrier Client' : undefined}
          onAction={canEdit ? onAddClient : undefined}
        />
      )}

      {clients.length > 0 && filteredClients.length === 0 && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-8 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-slate-400 mb-1">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">No Carrier Clients Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No clients match your search query or filter criteria. Try adjusting your filters.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {filteredClients.length > 0 && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table id="clients-table" className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-4 py-3 min-w-[180px]">Client / Carrier</th>
                  <th className="px-4 py-3 min-w-[120px]">Type</th>
                  <th className="px-4 py-3 min-w-[180px]">Primary Contact</th>
                  <th className="px-4 py-3 min-w-[160px]">Preferred Equipment</th>
                  <th className="px-4 py-3 min-w-[100px]">Target RPM</th>
                  <th className="px-4 py-3 min-w-[90px]">Status</th>
                  <th className="px-4 py-3 min-w-[110px]">Created</th>
                  <th className="px-4 py-3 text-right min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredClients.map((client) => {
                  const isInactive = client.status === 'inactive';
                  const isRowToggling = togglingClientId === client.id;

                  return (
                    <tr
                      key={client.id}
                      id={`client-row-${client.id}`}
                      className={`hover:bg-slate-800/40 transition-colors font-sans group ${
                        isInactive ? 'opacity-70 bg-slate-950/30' : ''
                      }`}
                    >
                      {/* Company Name */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onViewDetails(client)}
                          className="font-semibold text-slate-100 hover:text-indigo-400 text-left transition-colors cursor-pointer group-hover:underline flex items-center gap-1.5"
                        >
                          <span>{client.company_name}</span>
                          <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        {client.preferred_lanes && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5" title={client.preferred_lanes}>
                            {client.preferred_lanes}
                          </div>
                        )}
                      </td>

                      {/* Client Type */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[11px] font-mono capitalize border border-slate-700/50">
                          {client.client_type === 'owner_operator' ? 'Owner-Op' : 'Fleet'}
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="px-4 py-3 text-slate-300">
                        <div className="font-medium text-slate-200">
                          {client.contact_name || '—'}
                        </div>
                        <div className="flex flex-col gap-0.5 text-[11px] text-slate-400 mt-0.5">
                          {client.contact_phone && (
                            <span className="font-mono">{client.contact_phone}</span>
                          )}
                          {client.contact_email && (
                            <span className="truncate max-w-[160px]" title={client.contact_email}>
                              {client.contact_email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Equipment */}
                      <td className="px-4 py-3 text-slate-300">
                        <span className="truncate block max-w-[160px]" title={client.preferred_equipment || 'Any'}>
                          {client.preferred_equipment || 'Any standard'}
                        </span>
                      </td>

                      {/* Target RPM */}
                      <td className="px-4 py-3 font-mono">
                        {client.minimum_rate_per_mile !== null && client.minimum_rate_per_mile !== undefined ? (
                          <span className="text-emerald-400 font-bold">
                            ${client.minimum_rate_per_mile.toFixed(2)}/mi
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            isInactive
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50'
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-3 text-slate-400 text-[11px] font-mono">
                        {formatInTimezone(client.created_at, timezone, {
                          includeTime: false,
                          includeTimezoneCode: false,
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {/* View Details */}
                          <button
                            id={`client-view-btn-${client.id}`}
                            onClick={() => onViewDetails(client)}
                            title="View Client Details"
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            aria-label={`View details for ${client.company_name}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit (Admin & Dispatcher) */}
                          {canEdit && (
                            <button
                              id={`client-edit-btn-${client.id}`}
                              onClick={() => onEditClient(client)}
                              title="Edit Client"
                              className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/50 rounded-md transition-colors cursor-pointer"
                              aria-label={`Edit ${client.company_name}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Deactivate / Reactivate (Admin & Dispatcher) */}
                          {canEdit && (
                            <button
                              id={`client-toggle-status-btn-${client.id}`}
                              onClick={() => onToggleStatus(client)}
                              disabled={isRowToggling}
                              title={isInactive ? 'Reactivate Client' : 'Deactivate Client'}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50 ${
                                isInactive
                                  ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50'
                                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/50'
                              }`}
                              aria-label={`${isInactive ? 'Reactivate' : 'Deactivate'} ${client.company_name}`}
                            >
                              <Power className={`w-3.5 h-3.5 ${isRowToggling ? 'animate-spin' : ''}`} />
                            </button>
                          )}

                          {/* Delete (Owner Admin Only) */}
                          {canDelete && onDeleteClient && (
                            <button
                              id={`client-delete-btn-${client.id}`}
                              onClick={() => onDeleteClient(client)}
                              title="Delete Client"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-md transition-colors cursor-pointer"
                              aria-label={`Delete ${client.company_name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Table Footer Count */}
          <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              Showing {filteredClients.length} of {clients.length} carrier {clients.length === 1 ? 'client' : 'clients'}
            </span>
            <span className="font-mono text-slate-500">
              Active: {clients.filter((c) => c.status === 'active').length} • Inactive: {clients.filter((c) => c.status === 'inactive').length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
