import React from 'react';
import {
  PipelineStatus,
  DocumentStatus,
  TruckStatus,
  DriverStatus,
  CreditStatus,
  UserRole,
} from '../../types/domain.types.ts';

interface StatusBadgeProps {
  status: PipelineStatus | DocumentStatus | TruckStatus | DriverStatus | CreditStatus | UserRole | string;
  type?: 'pipeline' | 'document' | 'truck' | 'driver' | 'credit' | 'role' | 'status' | 'profitability';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'pipeline', size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let label = status ? status.replace(/_/g, ' ') : '';

  if (type === 'credit') {
    switch (status as CreditStatus) {
      case 'approved':
        colorClasses = 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60';
        label = 'Approved';
        break;
      case 'caution':
        colorClasses = 'bg-amber-950/50 text-amber-300 border-amber-800/60';
        label = 'Caution';
        break;
      case 'factoring_only':
        colorClasses = 'bg-sky-950/50 text-sky-300 border-sky-800/60';
        label = 'Factoring Only';
        break;
      case 'blocked':
        colorClasses = 'bg-rose-950/50 text-rose-300 border-rose-800/60';
        label = 'Blocked / DNU';
        break;
    }
  } else if (type === 'status') {
    if (status === 'active') {
      colorClasses = 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60';
      label = 'Active';
    } else {
      colorClasses = 'bg-slate-800 text-slate-400 border-slate-700';
      label = 'Inactive';
    }
  } else if (type === 'pipeline') {
    switch (status as PipelineStatus) {
      case 'sourced':
        colorClasses = 'bg-slate-800 text-slate-200 border-slate-700';
        label = 'Sourced';
        break;
      case 'negotiating':
        colorClasses = 'bg-amber-950/40 text-amber-300 border-amber-800/50';
        label = 'Negotiating';
        break;
      case 'booked':
        colorClasses = 'bg-blue-950/40 text-blue-300 border-blue-800/50';
        label = 'Booked';
        break;
      case 'in_transit':
        colorClasses = 'bg-purple-950/40 text-purple-300 border-purple-800/50';
        label = 'In Transit';
        break;
      case 'delivered':
        colorClasses = 'bg-teal-950/40 text-teal-300 border-teal-800/50';
        label = 'Delivered';
        break;
      case 'invoiced':
        colorClasses = 'bg-indigo-950/40 text-indigo-300 border-indigo-800/50';
        label = 'Invoiced';
        break;
      case 'paid':
        colorClasses = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50';
        label = 'Paid';
        break;
    }
  } else if (type === 'document') {
    switch (status as DocumentStatus) {
      case 'missing':
        colorClasses = 'bg-rose-950/40 text-rose-300 border-rose-800/50';
        label = 'Missing';
        break;
      case 'pending':
        colorClasses = 'bg-amber-950/40 text-amber-300 border-amber-800/50';
        label = 'Pending';
        break;
      case 'received':
        colorClasses = 'bg-blue-950/40 text-blue-300 border-blue-800/50';
        label = 'Received';
        break;
      case 'verified':
        colorClasses = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50';
        label = 'Verified';
        break;
    }
  } else if (type === 'role') {
    switch (status as UserRole) {
      case 'owner_admin':
        colorClasses = 'bg-purple-900/50 text-purple-200 border-purple-700/60';
        label = 'Owner / Admin';
        break;
      case 'dispatcher':
        colorClasses = 'bg-blue-900/50 text-blue-200 border-blue-700/60';
        label = 'Dispatcher';
        break;
      case 'staff':
        colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
        label = 'Staff';
        break;
    }
  } else if (type === 'profitability') {
    switch (status) {
      case 'healthy':
        colorClasses = 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60';
        label = 'Healthy (≥15%)';
        break;
      case 'review':
        colorClasses = 'bg-amber-950/50 text-amber-300 border-amber-800/60';
        label = 'Review (<15%)';
        break;
      case 'loss':
        colorClasses = 'bg-rose-950/50 text-rose-300 border-rose-800/60';
        label = 'Loss (<0%)';
        break;
      default:
        colorClasses = 'bg-slate-800 text-slate-400 border-slate-700';
        label = status ? status.replace(/_/g, ' ') : '';
        break;
    }
  } else if (type === 'truck' || type === 'driver') {
    if (status === 'active' || status === 'available') {
      colorClasses = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50';
    } else if (status === 'on_load') {
      colorClasses = 'bg-purple-950/40 text-purple-300 border-purple-800/50';
    } else if (status === 'maintenance' || status === 'off_duty') {
      colorClasses = 'bg-amber-950/40 text-amber-300 border-amber-800/50';
    } else {
      colorClasses = 'bg-slate-800 text-slate-400 border-slate-700';
    }
  }

  return (
    <span
      id={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-md border tracking-wide uppercase font-semibold ${sizeClasses} ${colorClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      <span className="capitalize">{label}</span>
    </span>
  );
};
