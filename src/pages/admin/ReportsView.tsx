import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  Download,
  Calendar,
  Building2,
  Clock,
  Printer,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api } from '../../api/client.ts';

export const ReportsView: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [startDate, endDate]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsageReport(startDate || undefined, endDate || undefined);
      setReport(res);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    const url = api.downloadBookingsCsvUrl(startDate || undefined, endDate || undefined);
    window.location.href = url;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Booking & Utilization Reports
          </h1>
          <p className="text-xs text-slate-500">
            Audit-ready conference hall metrics, department usage breakdown, and Excel exports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="no-print inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="no-print inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Date Filters (No-print) */}
      <div className="no-print p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-slate-700">Filter Date Range:</span>
        <div className="flex items-center gap-2">
          <label className="text-slate-500">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-200 font-mono text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-slate-500">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-200 font-mono text-xs"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="text-blue-600 hover:underline font-semibold"
          >
            Reset Dates
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Total Confirmed Bookings</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900">
            {report?.confirmed_count || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Successfully booked & confirmed</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Total Hall Usage Hours</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900">
            {report?.total_hours_booked || 0}h
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Cumulative hall reservation time</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Cancelled Bookings</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900">
            {report?.cancelled_count || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Slots released back to schedule</p>
        </div>
      </div>

      {/* Department Usage Breakdown */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900">Department-wise Hall Utilization</h2>
          <p className="text-xs text-slate-500">Ranking by total reserved hours and event count</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4 font-mono">Code</th>
                <th className="py-2.5 px-4 text-right">Confirmed Bookings</th>
                <th className="py-2.5 px-4 text-right">Total Hours</th>
                <th className="py-2.5 px-4 text-right">Share of Hall Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report?.by_department?.map((d: any) => {
                const totalH = report.total_hours_booked || 1;
                const percentage = Math.round((d.total_hours / totalH) * 100);

                return (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{d.department_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 font-semibold">{d.department_code}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {d.booking_count}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                      {d.total_hours}h
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {percentage}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
