import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, Search, Filter } from 'lucide-react';
import { api } from '../../api/client.ts';
import type { AuditLog } from '../../types/index.ts';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('ALL');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs(100);
      setLogs(res.audit_logs);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (filterAction !== 'ALL' && !l.action.includes(filterAction)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            System Audit Log
          </h1>
          <p className="text-xs text-slate-500">
            Immutable university audit trail of all booking confirmations, cancellations, user modifications, and hall parameter updates.
          </p>
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 shadow-xs"
        >
          <option value="ALL">All Actions</option>
          <option value="BOOKING">Booking Events</option>
          <option value="USER">User / Auth Events</option>
          <option value="CLOSURE">Closure Events</option>
          <option value="HALL">Hall Settings</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                    {l.actor_name}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        l.action.includes('CONFIRM')
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : l.action.includes('CANCEL')
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {l.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {l.entity_type} {l.entity_id ? `(${l.entity_id.slice(0, 12)})` : ''}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[10px] max-w-md truncate">
                    {l.details_json}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
