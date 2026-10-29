import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import type { BookingStatus } from '../../types/index.ts';

interface StatusChipProps {
  status: BookingStatus | 'MAINTENANCE' | 'CONFLICT';
  className?: string;
  showIcon?: boolean;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, className = '', showIcon = true }) => {
  switch (status) {
    case 'CONFIRMED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
          <span>Confirmed</span>
        </span>
      );
    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
        >
          {showIcon && <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
          <span>Cancelled</span>
        </span>
      );
    case 'MAINTENANCE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
        >
          {showIcon && <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
          <span>Closure / Maint.</span>
        </span>
      );
    case 'CONFLICT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-800 border border-red-200 ${className}`}
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
          <span>Conflict</span>
        </span>
      );
    default:
      return null;
  }
};
