import React from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  CheckCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import type { NotificationType } from '../../types/index.ts';

interface NotificationsViewProps {
  onOpenBookingById?: (bookingId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onOpenBookingById }) => {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useAuth();

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'BOOKING_CANCELLED':
        return <XCircle className="w-5 h-5 text-rose-600 shrink-0" />;
      case 'HALL_CLOSURE':
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600 shrink-0" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Notification Center
          </h1>
          <p className="text-xs text-slate-500">
            Persistent alerts regarding booking confirmations, cancellations, and hall notices.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllNotificationsRead()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>No notifications on record.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const isUnread = !n.is_read;
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (isUnread) markNotificationRead(n.id);
                  }}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors cursor-pointer ${
                    isUnread ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="pt-0.5">{getNotificationIcon(n.type)}</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900">{n.title}</h3>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{n.message}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {new Date(n.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </p>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationRead(n.id);
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 shrink-0 self-center"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
